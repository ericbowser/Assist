const express = require('express');
const router = express.Router();
const {addEmbedding, getEmbedding} = require('./Embeddings');
const initialiseAssist = require('./client/openAiClient');
const {askAssist} = require('./AskAssist')
const config = require('dotenv').config();
const cors = require('cors');
const {connectLocalPostgres} = require('./pg/client');
const {getAccount} = require('./api/binanceSpotApi');

router.use(express.json());
router.use(cors());
router.use(express.urlencoded({extended: true}));

router.get("/getBinanceAssets", async (req, res) => {
    try {
        const account = getAccount();
        return res.status(200).send(account).end();
    } catch (err) {
        console.error(err);
        return res.status(500).send(err).end();
    }
});

router.post("/askAssist", async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).send("Error: No message").end();
        }

        const client = await initialiseAssist();

        const question = req?.body?.content || null;
        const instructions = req?.body?.instructions || null;

        if (!question) {
            return res.status(400).send({Message: `bad request for params ${question}`})
        }

        let messageContent = null;
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

            const response = await client.create(body);
            console.log(response);
            if (response) {
                console.log('success response', response.choices[0]);
                return res.status(200).send(response.choices[0])
            } else {
                console.error('Failed to get response', response);
                return res.status(500).send(response);
            }
        } else {
            console.log('not initialized')
            const message = {
                Message: "Client isn't initialized"
            }

            return res.status(500).send(message).end();
        }

    } catch (err) {
        console.error(err);
        return res.status(500).send(err).end();
    }
})

router.post("/save", async (req, res) => {
    const message = req.body;
    console.log('Message body', message);
    try {
        if (message) {
            const content = message.content;
            const timeStamp = message.timestamp;
            const threadId = message.threadId;
            const connection = await connectLocalPostgres();
            const query =
                `INSERT INTO public.messages(content, timestamp, thread_id)
                 VALUES ('${content}', '${timeStamp}', '${threadId}')`;

            const save = await connection.query(query);
            console.log(save.rowCount);
            const rowcount = {
                "row count": save.rowCount
            };
            return res.status(200).send(rowcount).end();
        } else {
            return res.status(400).send().end();
        }

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

module.exports = router;