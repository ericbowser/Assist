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
const connectToMongo = require("./documentdb/mongoClient");
const geminiFlashModel = require("./client/geminiClient");
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
  let data = {
    user: null,
    error: null
  };


  let sessionResponse = null;
  const uniqueIdentifier = uuidv4();
  try {
    const connection = await connectLocalDockerPostgres();
    const query =
      `SELECT *
             FROM public."user"
             WHERE email = '${email}'
               AND password = '${password}'`;

    const user = await connection.query(query);
    let sessionSql = `INSERT INTO "public".sessions(sessionid, userid, state) VALUES (${uniqueIdentifier}, ${user.userid}, 'active')
            ON CONFLICT (sessionid) 
              DO UPDATE SET
                sessionstart = NOW(),
                           duration = 0,
                           sessionstate = $3
                           RETURNING *;`;
    if (user.rowCount > 0) {
      _logger.info("User found: ", {found: user.rows[0].userid});

      const userid = user.rows[0].userid;
      data = {
        userid: userid,
        user: user.rows[0],
        exists: true,
        error: null
      };



      sessionResponse = await connection.query(sessionSql);
      _logger.info('Session saved: ', {session: sessionResponse.rows[0]});

      if (sessionResponse.rowCount > 0) {
        return res.status(204).send({...data}).end();
      } else {
        return res.status(500).send('Failed to save session').end();
      }
    }

    _logger.info('Saving new login record...');

    const loggedIn = await connection.query(sql);
    if (loggedIn.rowCount > 0) {
      _logger.info('User saved', {userInfo: {...loggedIn.rows[0]}});
      const userid = loggedIn.rows[0].userid;
      data = {
        userid: userid,
        user: loggedIn.rows[0],
        exists: false,
        error: null
      };

      _logger.info('Unique identifier for session id: ', {uniqueIdentifier});
      const sessionResponse = await connection.query(sessionSql);

      if (sessionResponse.rowCount > 0) {
        _logger.info('Session saved: ', {session: sessionResponse.rows[0]});
        return res.status(201).send({...data}).end();
      } else {
        return res.status(500).send('Failed to save session').end();
      }
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send(err.message).end();
  }
});

router.get("/getContact/:userid", async (req, res) => {
  const userid = req.params.userid;
  _logger.info('user id param', {userid});
  try {
    const userId = parseInt(userid);
    const sql = `SELECT *
                     FROM public."contact"
                     WHERE userid = ${userId}`;
    const connection = await connectLocalPostgres();
    const response = await connection.query(sql);
    _logger.info('response', {response});
    let contact = null;
    if (response.rowCount > 0) {
      contact = {
        userid: response.rows[0].userid.toString(), //response.rows[0].userid,
        firstname: response.rows[0].firstname,
        lastname: response.rows[0].lastname,
        petname: response.rows[0].petname,
        phone: response.rows[0].phone,
        address: response.rows[0].address,
      }
      _logger.info('Contact found: ', {contact});
      const data = {
        contact: contact,
        exists: true,
        status: 201
      }
      return res.status(201).send({...data}).end();
    } else {
      const data = {
        contact: response.rows[0],
        userid: userId,
        exists: false,
        status: 204
      }
      return res.status(204).send({...data}).end();
    }
  } catch (error) {
    console.log(error);
    _logger.error('Error getting contact: ', {error});
    return res.status(500).send(error).end();
  }
});

router.post("/saveContact", async (req, res) => {
  const {userid, firstname, lastname, petname, phone, address,} = req.body;
  _logger.info('request body for save contact: ', {request: req.body});

  try {
    const connection = await connectLocalPostgres();
    const query = `
            INSERT INTO public.contact(firstname, lastname, petname, phone, address, userid)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;

    const values = [
      firstname,
      lastname,
      petname,
      phone,
      address,
      parseInt(userid)
    ];

    const response = await connection.query(query, values);

    _logger.info('Contact saved: ', {response: response.rows[0]});
    const contact = {
      userid: response.rows[0].userid.toString(),
      contact: response.rows[0]
    }

    return res.status(201).send(contact).end();
  } catch (error) {
    console.error(error);
    _logger.error('Error saving contact: ', {error});

    return res.status(500).send(error).end();
  }
});

router.post("/updateContact", async (req, res) => {
  const {userid, firstname, lastname, petname, phone, address,} = req.body;
  _logger.info('request body for update contact: ', {request: req.body});

  try {
    const connection = await connectLocalPostgres();
    const query = `UPDATE public.contact
                       SET firstname = $1,
                           lastname  = $2,
                           petname   = $3,
                           phone     = $4,
                           address   = $5
                       WHERE userid = $6;`;

    const values = [
      firstname,
      lastname,
      petname,
      phone,
      address,
      parseInt(userid)
    ];

    const response = await connection.query(query, values);
    _logger.info('Contact updated: ', {response});
    if (response.rowCount > 0) {
      _logger.info('Contact updated: ', {contactUpdated: response.rowCount});
      return res.status(200).send({contactUpdated: true}).end();
    } else {
      return res.status(200).send({contactUpdated: false}).end();
    }
  } catch (error) {
    console.error(error);
    _logger.error('Error saving contact: ', {error});

    return res.status(500).send(error).end();
  }
});


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