const express = require('express');
const router = express.Router();
const {addEmbedding, getEmbedding} = require('./Embeddings');
const {connectLocalPostgres} = require('./documentdb/client');
const {getAccount} = require('./api/binanceSpotApi');
const axios = require('axios');
const sendEmailWithAttachment = require('./api/gmailSender');
const getLogger = require('./assistLog');
const getExchanges = require('./api/ccxtApi');
const cors = require('cors');
const {InitialiseClient, AssistMessage, AssistImage} = require("./client/openAiClient");
const {deepSeekChat, deepSeekImage} = require("./client/deepSeekClient");
const askClaude = require("./client/anthropicClient");
const bodyParser = require('body-parser');
const ImageModel = require('./helpers/Types');
const {GenerateFromTextInput} = require('./client/geminiClient');

router.use(bodyParser.json());
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({extended: true}));

let _logger = getLogger();
_logger.info("Logger Initialized")

let assistClient = null;

router.get("/getBinanceAssets", async (req, res) => {
  try {
    const account = getAccount();
    return res.status(200).send(account).end();
  } catch (err) {
    console.error(err);
    return res.status(500).send(err).end();
  }
});

router.get("/getTransactions", async (req, res) => {
  try {
    const response = await axios.post(process.env.ALPACA_BASE_URL2);
    return res.status(200).send(response.data).end();
  } catch (err) {
    console.error(err);
  }
});

router.post("/askClaude", async (req, res) => {
  const {content} = req.body;
  if (!req.body) {
    return res.status(400).send("Error: No message").end();
  }
  _logger.info("Calling ask Claude through Anthropic API", {content});

  try {
    const message = await askClaude(content);
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
      console.log('sending response: ', {...data});
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
  const {content} = req.body;
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
  _logger.info("Calling DeepSeek API form image: ", {content});
  try {
    const response = await deepSeekImage(content.question);
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

router.get("/ccxt", async (req, res) => {
  const exchanges = await getExchanges();
  return res.status(200).send({exchanges: exchanges}).end();
})

router.post("/askChat", async (req, res) => {
  const {content} = req.body;
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
    console.log(resp)
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
    return res.status(500).send(err).end();
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
    return res.status(500).send(err).end();
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
  try {
    const {promptCategory} = req.body;
    if (!promptCategory) {
      return res.status(400).send({error: 'bad request'}).end();
    }
    const connection = await connectLocalPostgres();
    const sql =
      `SELECT prompt
       FROM public.prompt p
                INNER JOIN public.promptcategory pc
                           ON pc.id = p.categoryid
       WHERE pc.category = '${promptCategory}'`;

    const response = await connection.query(sql);

    return res.status(200).send(response).end();
  } catch (err) {
    console.log(err);
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
       VALUES ('${prompt}', '${prompt}')`;
    const response = await connection.query(sql);

    return res.status(200).send(response).end();
  } catch (err) {
    console.log(err);
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
    console.error('Error generating image:', error);
    res.status(500).send('Error generating image');
  }
});

router.post("/addEmbedding", async (req, res) => {
  const text = req.body.text;

  let json = {};
  let addedEmbedding;
  if (text) {
    addedEmbedding = await addEmbedding(text);
  } else {
    json = {
      error: `Failed to add embedding ${text}`
    }
    return res.status(500).send(json).end();
  }

  if (addedEmbedding) {
    json = JSON.parse(addedEmbedding);
  } else {
    json = {
      error: `Failed to add embedding ${text}`
    }
  }

  return res.status(200).send(json).end();
})

router.get("/getEmbedding", async (req, res) => {
  const request = req.body;

  const embedding = await getEmbedding(request);
  if (embedding) {
    const parsed = JSON.parse(embedding);
    return res.status(200).send(parsed).end();
  } else {
    const errorMessage = {
      error: "failed to get embedding"
    }
    return res.status(500).send(errorMessage).end();
  }
})

router.post('/sendEmail', async (req, res) => {
  const {from, subject, message} = req.body;

  try {
    _logger.info("Sending email: ", {from, subject, message})
    const messageId = await sendEmailWithAttachment(from, subject, message)
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

module.exports = router;