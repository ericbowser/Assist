const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const {addEmbedding, getEmbedding} = require('./Embeddings');
const {connectLocalPostgres} = require('./documentdb/client');
const axios = require('axios');
// const sendEmailWithAttachment = require('./api/gmailSender');
const getLogger = require('./assistLog');
const {InitialiseClient, AssistMessage, AssistImage} = require("./client/openAiClient");
const {deepSeekChat, deepSeekImage} = require("./client/deepSeekClient");
const askClaude = require("./client/anthropicClient");
const bodyParser = require('body-parser');
const ImageModel = require('./helpers/Types');
const {GenerateFromTextInput} = require('./client/geminiClient');
const {sendEmailWithAttachment} = require('./api/gmailSender');
const { textToImage: hfTextToImage, textToImageFlux: hfTextToImageFlux, textToImageFlux2Turbo: hfTextToImageFlux2Turbo } = require('./client/huggingFaceClient');

router.use(bodyParser.json());
router.use(express.json());
router.use(express.urlencoded({extended: true}));

let _logger = getLogger();
_logger.info("Logger Initialized");

const IMAGES_DIR = path.join(__dirname, 'images');
fs.mkdir(IMAGES_DIR, { recursive: true }).catch((err) => _logger.error('images dir', err));
router.use('/images', express.static(IMAGES_DIR));

let assistClient = null;

router.get("/getTransactions", async (req, res) => {
  _logger.info('getTransactions requested');
  try {
    const response = await axios.post(process.env.ALPACA_BASE_URL2);
    _logger.info('getTransactions success', { dataLength: response?.data?.length });
    return res.status(200).send(response.data).end();
  } catch (err) {
    _logger.error('getTransactions error', err);
    return res.status(500).send(err).end();
  }
});

router.post("/askClaude", async (req, res) => {
  const {content} = req.body;
  if (!req.body) {
    return res.status(400).send("Error: No message").end();
  }
  _logger.info("Calling ask Claude through Anthropic API", {content});
  let messages = [];
  content.forEach(x => {
    messages.push(x.content);
  })

  try {
    const message = await askClaude(messages);
    _logger.info("Updated history: ", {message});

    if (message) {
      return res.status(200).send(message).end();
    } else {
      return res.status(400).send(message).end();
    }
  } catch (error) {
    _logger.error(error);
  }

  return res.status(500).send(message).end();
});

router.post("/askGemini", async (req, res) => {
  const {content} = req.body;
  if (!content) {
    return res.status(400).send("Error: No message").end();
  }
  _logger.info("Calling gemini API with question: ", {content});
  try {
    const message = await GenerateFromTextInput(content);
    if (message) {
      const data = {
        answer: message.content[0].text,
        thread: message.id
      };
      _logger.info('askGemini response', data);
      return res.status(200).send(data).end();
    } else {
      return res.status(400).send(message).end();
    }
  } catch (error) {
    _logger.error(error);
    return res.status(500).send(error).end();
  }
});

router.post("/askDeepSeek", async (req, res) => {
  const {role, content, thread} = req.body.content[0];
  _logger.info("Calling seek seek");
  _logger.info("role, content, and thread", role, content, thread);
  if (!content) {
    return res.status(400).send("Error: No message").end();
  }
  _logger.info("Calling DeepSeek API with question: ", {content});
  try {
    const response = await deepSeekChat(content.question);
    const currentMessage = response?.choices[0]?.message?.content;
    if (!currentMessage) {
      _logger.error('message is not defined as expected', {currentMessage});
      return res.status(400).send(currentMessage).end();
    }
    _logger.info("Calling DeepSeek API form image: ", {content: currentMessage});
    const data = {
      answer: currentMessage,
      thread: response.id
    }
    if (data) {
      return res.status(200).send(data).end();
    } else {
      return res.status(400).send({error: 'bad request'}).end();
    }
  } catch (error) {
    _logger.error(error);
    throw error;
  }
});

router.post("/deepSeekImage", async (req, res) => {
  const {content} = req.body;
  if (!content) {
    return res.status(400).send("Error: No message").end();
  }
  _logger.info("deepSeekImage requested", { content });
  try {
    const response = await deepSeekImage(content.question);
    const data = response?.data ?? response;
    if (data) {
      _logger.info("deepSeekImage success");
      return res.status(200).send(data).end();
    } else {
      return res.status(400).send({ error: 'bad request' }).end();
    }
  } catch (error) {
    _logger.error('deepSeekImage error', error);
    return res.status(500).send(error).end();
  }
});

router.post("/askChat", async (req, res) => {
  const {content} = req.body;
  _logger.info('askChat requested', { contentLength: content?.length });
  try {
    if (!req.body) {
      return res.status(400).send("Error: No message").end();
    }

    const chatClient = await InitialiseClient();

    if (content?.length < 1) {
      return res.status(400).send({Message: `bad request for params ${question}`})
    }

    // Validate each message in the content array
    for (const message of content) {
      if (!message.role || !message.content || typeof message.content !== 'string') {
        return res.status(400).send({error: "Invalid message format. Each message must have a 'role' and a 'content' string."}).end();
      }
    }

    const body = {
      model: "gpt-4o-mini",
      messages: content,
      stream: false
    }

    const resp = await chatClient.chat.completions.create(body);
    _logger.info('askChat response', { thread: resp?.id });
    if (resp) {
      const data = {
        thread: resp.id,
        answer: resp.choices[0].message.content
      };

      return res.status(200).send(data).end();
    } else {
      _logger.error('Failed to get response', resp);
      return res.status(500).send(resp);
    }
  } catch (err) {
    _logger.error("Failed with error: ", {err});
    return res.status(500).send({error: "Internal server error"}).end();
  }
});

router.post("/askAssist", async (req, res) => {

  _logger.info("Calling /askAssist and Request body: ", req.body);

  try {
    if (!req.body) {
      return res.status(400).send("Error: No message").end();
    }

    const question = req?.body?.content?.question || null;
    const history = req?.body?.content?.history || null;
    const instructions = req?.body?.instructions || null;

    if (!question) {
      return res.status(400).send({Message: `bad request for params ${question}`})
    }

    const assistClient = await InitialiseClient();
    assistClient.models[0] = process.env.DEEPSEEK_REASON_MODEL;
    _logger.info('Assistant client model: ', {'Model': assistClient.model});

    const response = await AssistMessage(question, history, instructions);
    _logger.info("Response: ", {response});
    if (response) {
      return res.status(200).send(response).end();
    }

    return res.status(500).send({error: "Thread failed to run"}).end();
  } catch (err) {
    _logger.error("Failed with error: ", {err});
    return res.status(500).send({error: "Internal server error"}).end();
  }
});

async function retry(queueThread = () => {
}) {
  const promise = new Promise((resolve, reject) => {
    queueThread().then(res => {
      if (res.status === 'completed') {
        resolve(true);
      } else {

      }
    });
    setTimeout(() => {
      reject('Timeout Error: Promise took too long to resolve');
    }, 2000);
  });
}

router.post("/fetchPrompts", async (req, res) => {
  const { promptCategory } = req.body;
  _logger.info('fetchPrompts requested', { promptCategory });
  try {
    if (!promptCategory) {
      return res.status(400).send({ error: 'bad request' }).end();
    }
    const connection = await connectLocalPostgres();
    const sql =
      `SELECT prompt
       FROM public.prompt p
                INNER JOIN public.promptcategory pc
                           ON pc.id = p.categoryid
       WHERE pc.category = $1`;

    const response = await connection.query(sql, [promptCategory]);
    _logger.info('fetchPrompts success', { rows: response?.rows?.length });
    return res.status(200).send(response).end();
  } catch (err) {
    _logger.error('fetchPrompts error', err);
    return res.status(500).send(err.message).end();
  }
})

router.post("/savePrompt", async (req, res) => {
  try {
    const {category, prompt, description = ''} = req.body;
    _logger.info('Save prompt params: ', {category, prompt, description});
    if (!prompt) {
      return res.status(400).send({error: 'bad request'}).end();
    }
    const connection = await connectLocalPostgres();
    const sql =
      `INSERT INTO public.prompt(prompt)
       VALUES ($1, $2)`;
    const response = await connection.query(sql, [prompt, prompt]);
    _logger.info('savePrompt success');
    return res.status(200).send(response).end();
  } catch (err) {
    _logger.error('savePrompt error', err);
    return res.status(500).send(err.message).end();
  }
})

router.post('/generateImageDallE', async (req, res) => {
  const {content} = req.body;
  _logger.info('generate image', {content});

  try {
    const data = await AssistImage(content.question, content.size, content.model);
    if (data.answer) {
      res.status(200).send({...data}).end();
    } else {
      return res.status(500).send({'Error': 'Error generating image'});
    }
  } catch (error) {
    _logger.error('generateImageDallE error', error);
    res.status(500).send('Error generating image');
  }
});

router.post('/textToImage', async (req, res) => {
  const messages = Array.isArray(req.body) ? req.body : req.body?.content;
  const prompt = messages?.[0]?.content ?? req.body?.question ?? req.body?.prompt;
  const parameters = { num_inference_steps: 8, width: 1024, height: 1024, ...(req.body?.parameters ?? {}) };
  if (!prompt) {
    return res.status(400).send({ error: 'Missing prompt (e.g. messages[0].content)' }).end();
  }
  if (!process.env.HF_TOKEN) {
    return res.status(500).send({ error: 'HF_TOKEN not configured' }).end();
  }
  _logger.info('textToImage requested', { prompt: prompt?.slice(0, 80), parameters });
  try {
    const image = await hfTextToImage(prompt, parameters);
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = `textToImage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    await fs.writeFile(path.join(IMAGES_DIR, filename), buffer).catch((err) => _logger.error('save image', err));
    _logger.info('textToImage success', { filename, size: buffer.length });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(200).json({ url: `${baseUrl}/images/${filename}`, filename }).end();
  } catch (error) {
    _logger.error('textToImage error', error);
    res.status(500).send({ error: error?.message ?? 'Error generating image' }).end();
  }
});

router.post('/fluxImage', async (req, res) => {
  const messages = Array.isArray(req.body) ? req.body : req.body?.content;
  const prompt = messages?.[0]?.content ?? req.body?.question ?? req.body?.prompt;
  const parameters = { num_inference_steps: 5, width: 1024, height: 1024, ...(req.body?.parameters ?? {}) };
  if (!prompt) {
    return res.status(400).send({ error: 'Missing prompt (e.g. messages[0].content)' }).end();
  }
  if (!process.env.HF_TOKEN) {
    return res.status(500).send({ error: 'HF_TOKEN not configured' }).end();
  }
  _logger.info('fluxImage requested', { prompt: prompt?.slice(0, 80), parameters });
  try {
    const image = await hfTextToImageFlux(prompt, parameters);
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = `fluxImage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    await fs.writeFile(path.join(IMAGES_DIR, filename), buffer).catch((err) => _logger.error('save image', err));
    _logger.info('fluxImage success', { filename, size: buffer.length });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(200).json({ url: `${baseUrl}/images/${filename}`, filename }).end();
  } catch (error) {
    _logger.error('fluxImage error', error);
    res.status(500).send({ error: error?.message ?? 'Error generating image' }).end();
  }
});

router.post('/flux2TurboImage', async (req, res) => {
  const messages = Array.isArray(req.body) ? req.body : req.body?.content;
  const prompt = messages?.[0]?.content ?? req.body?.question ?? req.body?.prompt;
  const parameters = { num_inference_steps: 5, width: 1024, height: 1024, ...(req.body?.parameters ?? {}) };
  if (!prompt) {
    return res.status(400).send({ error: 'Missing prompt (e.g. messages[0].content)' }).end();
  }
  if (!process.env.HF_TOKEN) {
    return res.status(500).send({ error: 'HF_TOKEN not configured' }).end();
  }
  _logger.info('flux2TurboImage requested', { prompt: prompt?.slice(0, 80), parameters });
  try {
    const image = await hfTextToImageFlux2Turbo(prompt, parameters);
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = `flux2TurboImage-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    await fs.writeFile(path.join(IMAGES_DIR, filename), buffer).catch((err) => _logger.error('save image', err));
    _logger.info('flux2TurboImage success', { filename, size: buffer.length });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.status(200).json({ url: `${baseUrl}/images/${filename}`, filename }).end();
  } catch (error) {
    _logger.error('flux2TurboImage error', error);
    res.status(500).send({ error: error?.message ?? 'Error generating image' }).end();
  }
});

router.post('/sendEmail', async (req, res) => {
  const {name, email, subject, message} = req.body;

  try {
    _logger.info("Sending email: ", {name, email, subject, message});
    const messageId = await sendEmailWithAttachment(name, email, subject, message);
    _logger.info("Email sent with message id: ", {messageId})
    if (messageId) {
      res.status(200).send('Email Sent!').end();
    } else {
      res.status(500).send('Error').end();
    }
  } catch (error) {
    _logger.error('Error sending email: ', {error});
    res.status(500).json({message: 'Failed to send email.'});
  }
});


router.get('/getExamQuestions', async (req, res) => {
  const data = { };
  try {
    _logger.info("Fetching questions..");
    const ps = await connectLocalPostgres();
    const comptia = await ps.query("SELECT * FROM prepper.comptia_cloud_plus_questions");
    _logger.info("number of rows returned for comptia: ", {rows: comptia.rows.length});
    if (comptia.rows.length > 0) {
      data.comptiaQuestions = comptia.rows
    }
    const aws = await ps.query("SELECT * FROM prepper.aws_certified_architect_associate_questions");
    _logger.info("number of rows returned for aws: ", {rows: aws.rows.length});
    if (aws.rows.length > 0) {
      data.awsQuestions = aws.rows
    }
    
    return res.status(200).send(data).end();
  } catch (error) {
    _logger.error('Error fetching questions: ', {error});
    res.status(500).json({message: 'Failed to send email.'});
  }
});

module.exports = router;