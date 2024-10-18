const express = require('express');
const router = express.Router();
const {addEmbedding, getEmbedding} = require('./Embeddings');
const {InitialiseChat, InitialiseAssist} = require('./client/openAiClient');
const config = require('dotenv').config();
const cors = require('cors');
const {connectLocalPostgres} = require('./documentdb/client');
const {getAccount} = require('./api/binanceSpotApi');
const axios = require('axios');
const sendEmailWithAttachment = require('./api/gmailSender');
const getLogger = require('./assistLog');
const askClaude = require('./api/claudeApi');
const getExchanges = require('./api/ccxtApi');
const createCustomer = require('./api/stripe');
const {OpenAI} = require("openai");
const {sleep} = require("openai/core");
const bodyParser = require('body-parser');
const {AssistantCreateParams} = require("openai");
const connectToMongo = require("./documentdb/mongoClient");

router.use(bodyParser.json());
router.use(cors());
router.use(express.json());
router.use(express.urlencoded({extended: true}));

let _logger = getLogger();
_logger.info("Logger Initialized")

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
    const question = req.body?.content || null;
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

router.get("/ccxt", async (req, res) => {
    const exchanges = await getExchanges();
    return res.status(200).send({exchanges: exchanges}).end();
})

router.post("/askChat", async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).send("Error: No message").end();
        }

        const question = req?.body?.content || null;
        const instructions = req?.body?.instructions || null;
        console.log('question', question);
        console.log('instructions', instructions);

        const client = await InitialiseChat();

        if (!question) {
            return res.status(400).send({Message: `bad request for params ${question}`})
        }

        if (client) {
            const body = {
                model: config.parsed.OPENAI_API_MODEL,
                messages: [
                    {
                        "role": "user",
                        "content": question
                    },
                ],
                stream: false
            }

            const resp = await client.chat.completions.create(body);
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
        } else {
            const message = {
                Message: "Client isn't initialized"
            }
            _logger.info('not initialized', {message})

            return res.status(500).send(message).end();
        }
    } catch (err) {
        _logger.error("Failed with error: ", {err});
        return res.status(500).send(err).end();
    }
});

router.post("/askAssist", async (req, res) => {
    
    try {
        if (!req.body) {
            return res.status(400).send("Error: No message").end();
        }

        const question = req?.body?.content || null;
        const instructions = req?.body?.instructions || null;

        if (!question) {
            return res.status(400).send({Message: `bad request for params ${question}`})
        }

        const thread = await InitialiseAssist(question, instructions);
        if (thread) {
            return res.status(200).send(thread).end();
        }

        return res.status(500).send({error: "Thread failed to run"}).end();
    } catch (err) {
        _logger.error("Failed with error: ", {err});
        return res.status(500).send(err).end();
    }
});

router.get("/saveDocument", async (req, res) => {
    const {document} = req.body;

    try {
        if (!document) {
            return res.status(400).send("Error: No document to save").end();
        }
        
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

router.post("/login", async (req, res) => {
    const {email, password} = req.body;
    _logger.info('request body for laser tags: ', {credentials: req.body});
    try {
        const connection = await connectLocalPostgres();
        const query =
            `SELECT *
             FROM public."user"
             WHERE email = '${email}'
               AND password = '${password}'`;

        const user = await connection.query(query);
        if (user.rowCount > 0) {
            _logger.info("User found: ", {found: user.rows[0]});
            return res.status(200).send({data: user.rows[0], exists: true}).end();
        }

        _logger.info('Saving new login record...');
        const sql =
            `INSERT INTO public."user"(email, password, isloggedin, updateondate)
             VALUES ('${email}', '${password}', true, CURRENT_TIMESTAMP) RETURNING userid`;

        console.log(sql);
        const loggedIn = await connection.query(sql);

        if (loggedIn.rowCount > 0) {
            _logger.info('User saved', {loggedIn});
            return res.status(200).send({userid: loggedIn.rows[0].userid.toString()}).end();
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
            return res.status(201).send({...contact}).end();
        } else {
            return res.status(204).send({userid: userid}).end();
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

        return res.status(201).send(response.rows[0]).end();
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

router.post('/generateImage', async (req, res) => {
    const {prompt} = req.body;
    console.log('generate image', prompt);
    const openaiApiKey = process.env.OPENAI_API_KEY;

    try {
        const client = await InitialiseChat(openaiApiKey);
        /*  const response = await axios.post(
              'https://api.openai.com/v2/images/generations',
              {
                  prompt,
                  n: 1,
                  size: '1024x1024'
              },
              {
                  headers: {
                      'Authorization': `Bearer ${openaiApiKey}`,
                      'Content-Type': 'application/json'
                  }
              }
          );*/

        const params = {
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            response_format: 'url',
        };
        const imageUrl = await client.images.generate(params);
        _logger.info("Image response from OpenAI", {imageUrl})
        const image = imageUrl.data[0].url;
        celemenu.log('images', image);
        return image ? res.status(200).send({image}).end() : res.status(500).send('Error generating image');
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