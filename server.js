const express = require('express');
const router = express.Router();
const {addEmbedding, getEmbedding} = require('./Embeddings');
const {connectLocalPostgres, connectLocalDockerPostgres} = require('./documentdb/client');
const sendEmailWithAttachment = require('./api/gmailSender');
const getLogger = require('./assistLog');
const cors = require('cors');
const {InitialiseClient, AssistMessage} = require("./client/openAiClient");
const askClaude = require("./client/anthropicClient");
const bodyParser = require('body-parser');
const geminiFlashModel = require("./client/geminiClient");
const {alphaSquaredAssets, alphaSquaredStrategies, alphaSquaredHypotheticals} = require("./client/alphaSquaredClient");
const {v4: uuidv4} = require('uuid');

router.use(bodyParser.json());
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({extended: true}));

let _logger = getLogger();
_logger.info("Logger Initialized")

router.post("/askClaude", async (req, res) => {
  let message = '';
  if (!req.body) {
    return res.status(400).send("Error: No message").end();
  }
  const question = req.body?.content.question || null;
  _logger.info("Calling ask Claude through Anthropic API", {question});
  try {
    message = await askClaude(question);
    _logger.info('Claude question response', {message});
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
  const {content} = req.body;
  if (!content) {
    return res.status(400).send("Error: No message").end();
  }

  _logger.info("Calling gemini API with question: ", {content});
  const question = content?.question;

  try {
    const geminiFlash = geminiFlashModel();

    const startChatParams = {
      history: content?.history,
      question: question,

    }
    const y = await geminiFlash.startChat(startChatParams);
    if (y) {
      const message = y.sendMessage(question).then((response) => {
        console.log(response)
      });
      console.log('response message object: ', message.candidates.text);
      const data = {
        answer: text.message,
        thread: message.id
      };
      return res.status(200).send(data).end();
    } else {
      return res.status(400).send("No Message").end();
    }
  } catch (error) {
    _logger.error(error);
  }
});

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

      const formatted = history.map(item => {
        return {
          "role": "assistant",
          "content": item.answer
        },
          {
            "role": "user",
            "content": item.question
          }
      });
      _logger.info('formatted: ', {formatted});

      const messages = history && history.length > 1
        ? formatted
        : [{role: "user", content: question}];

      messages.push({role: "user", content: question});
      const body = {
        model: "gpt-4o-mini",
        messages: messages,
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
    } catch
      (err) {
      _logger.error("Failed with error: ", {err});
      return res.status(500).send(err).end();
    }
  }
)

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

    const ping = await connectToMongo();
    _logger.info("Mongo Client Ping: ", {ping});

    return res.status(200).send({movie}).end();

  } catch (err) {
    _logger.error("Failed with error: ", {err});
    return res.status(500).send(err).end();
  }
});

// Laser Tags login
router.post("/login", async (req, res) => {
  const {email, password} = req.body;
  _logger.info('request body for laser tags: ', {credentials: req.body});

  try {
    const session = {email, password};
    const response = await createSession(session);

    const data = {
      error: null,
      userid: response.userid,
    }
    if (!response.error) {
      return res.status(200).send({...response.data}).end();
    } else {
      return res.status(500).send(response.error).end();
    }
  } catch
    (err) {
    console.log(err);
    return res.status(500).send(err.message).end();
  }
})
;

router.post("/stripePayment", async (req, res) => {
  try {

  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message).end();
  }
});

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
  const {from, recipient, subject, message} = req.body;

  try {
    _logger.info("Sending email: ", {from, subject, message})
    const messageId = await sendEmailWithAttachment(from, recipient, subject, message)
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

router.get('/alphastrategies', async (req, res) => {
  try {
    const response  = await alphaSquaredStrategies();
    _logger.info('Alpha Squared Strategies: ', {response});
    return res.status(200).send(response).end();
  } catch (error) {
    _logger.error('Error sending email: ', {error});
    res.status(500).json({message: 'Failed to send email.'});
  }
});

module.exports = router;