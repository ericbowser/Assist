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
const connectToMongo = require("./documentdb/mongoClient");

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
  let message = '';
  if (!req.body) {
    return res.status(400).send("Error: No message").end();
  }
  const question = req.body?.content.question || null;
  _logger.info("Calling ask Claude through Anthropic API", {question});
  try {
    message = await askClaude(question);
    console.log(message)
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
  }

  return res.status(500).send(message).end();
});

router.post("/askGemini", async (req, res) => {
  const {question} = req.body;
  if (!question) {
    return res.status(400).send("Error: No message").end();
  }
  _logger.info("Calling gemini API with question: ", {question});
  try {
    const message = await askClaude(question);
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
  }

  return res.status(500).send(message).end();
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
  _logger.info("Calling /askChat and Request body: ", req.body);
  try {
    if (!req.body) {
      return res.status(400).send("Error: No message").end();
    }

    const question = req?.body?.content?.question || null;
    const history = req?.body?.content?.history || null;

    _logger.info('question', {question});
    /*
            _logger.info('chat history', {'Answers': [...history.answer]});
    */

    const chatClient = await InitialiseClient();
    console.log(chatClient)

    if (!question) {
      return res.status(400).send({Message: `bad request for params ${question}`})
    }

    const body = {
      model: "gpt-4o-mini",
      messages: [
        {
          "role": "user",
          "content": question
        },
      ],
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

router.get("/saveDocument", async (req, res) => {
  const {document} = req.body;
  _logger.info("passed document to save:", document);

  try {
    /* if (!document) {
         return res.status(400).send("Error: No document to save").end();
     }*/

    const movie = await connectToMongo();
    _logger.info("Mongo Client connected and test db movie: ", {movie});

    return res.status(200).send({movie}).end();

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

router.post("/fetchImageUrls", async (req, res) => {
  try {
    const {imageUrl, prompt} = req.body;
    if (!imageUrl) {
      return res.status(400).send({error: 'bad request'}).end();
    }
    const connection = await connectLocalPostgres();
    const sql = 'SELECT imageurl FROM public.images;';
    const response = await connection.query(sql);

    return res.status(200).send(response).end();
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message).end();
  }
})

router.post("/saveImageUrl", async (req, res) => {
  try {
    const {imageUrl, prompt} = req.body;
    if (!imageUrl) {
      return res.status(400).send({error: 'bad request'}).end();
    }
    const connection = await connectLocalPostgres();
    const sql = `INSERT INTO public.images(imageurl, prompt)
                 VALUES ('${imageUrl}', '${prompt}')`;
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
    _logger.info("Image response from OpenAI", {data})
    if (data) {
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