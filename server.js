const express = require('express');
const router = express.Router();
const {addEmbedding, getEmbedding} = require('./Embeddings');
const initialiseAssist = require('./client/openAiClient');
const config = require('dotenv').config();
const cors = require('cors');
const {connectLocalPostgres} = require('./pg/client');
const {getAccount} = require('./api/binanceSpotApi');
const axios = require('axios');
const sendEmailWithAttachment = require('./api/gmailSender');
const getLogger = require('./assistLog');
const askClaude = require('./api/claudeApi');
const getExchanges = require('./api/ccxtApi');

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
            const response = {
                data: message.content[0].text,
                thread: message.id
            }
            console.log('sending response: ', response);
            return res.status(200).send(response).end();
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

router.post("/askAssist", async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).send("Error: No message").end();
        }

        const client = await initialiseAssist();
        _logger.info("Received Assist client: ", {client})

        const question = req?.body?.content || null;
        const instructions = req?.body?.instructions || null;

        const cleanText = question.replace(/[\n']/g, '');
        _logger.info("Ask assist message exists from request body", {body: cleanText});

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
                    {
                        "role": "assistant",
                        "content": instructions
                    }
                ],
                stream: false
            }

            _logger.info("sending Assist message for model: ", {model: body.model})
            const response = await client.create(body);
            if (response) {
                _logger.info('success response', {response});
                return res.status(200).send(response).end();
            } else {
                _logger.error('Failed to get response', response);
                return res.status(500).send(response);
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

router.post("/login", async (req, res) => {
    const {username, password} = req.body;
    _logger.info('request body for laser tags: ', {credentials: req.body});
    try {
        const connection = await connectLocalPostgres();
        const query =
            `SELECT * FROM public."user" WHERE username = '${username}'
                AND password = '${password}'`;

        _logger.info("Fetching user if they exist", {query: query});
        const user = await connection.query(query);
        if (user.rowCount > 0) {
            _logger.info('User already exists', {user});
            return res.status(200).send({user}).end();
        } else {
            _logger.info('Saving new login record...');
            const sql = `INSERT INTO public."user"(username, password) VALUES (${username}, ${password}, true, CURRENT_TIMESTAMP); RETURN userid`;
            const loggedIn = await connection.query(sql);
            if(loggedIn) {
            
            }
        }
        
        // Save login info
        
        
        
        return res.status(200).send({'message': 'User saved', 'userId': 1}).end();
    } catch (err) {
        console.log(err);
        return res.status(500).send(err.message).end();
    }
});

/*
router.post("/saveLaserTag", async (req, res) => {
    const {userid, username, password} = req.body;
    _logger.info('request body for laser tags: ', {request: req.body});
    try {
        const connection = await connectLocalPostgres();
        const query =
            `INSERT INTO public."user"(username, password, firstname, lastname, petname, phone, address, city, state)
            VALUES ('${username}', '${password}', '${firstname}', '${lastname}', '${petname}', '${phone}', '${address}', '${city}', '${state}');`;
        
        _logger.info("Inserting into user using postgres with params: ", {query: query});
        const save = await connection.query(query);
        console.log(save.rowCount);
        const rowcount = {
            "row count": save.rowCount
        };
        return res.status(200).send(rowcount).end();
    } catch (err) {
        console.log(err);
        return res.status(500).send(err.message).end();
    }
})
*/

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
    const openaiApiKey = process.env.OPENAI_API_KEY;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/images/generations',
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
        );

        _logger.info("Image response from OpenAI", {response})
        const imageUrl = response.data.data[0].url;
        res.json({imageUrl});
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