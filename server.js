const express = require('express');
const router = express.Router();
const {addEmbedding, getEmbedding} = require('./Embeddings');
const initialiseAssist = require('./client/openAiClient');
// const askAssist = require('./AskAssist')
const config = require('dotenv').config();
const cors = require('cors');
const { connectLocalPostgres } = require('./pg/client');

router.use(express.json());
router.use(cors());
router.use(express.urlencoded({ extended: true }));

router.post("/askAssist", async (req, res) => {
	const client = await initialiseAssist();
	const question = req.body.question || null;
	const instructions = req.body.instructions || '';
	console.log('body', req.body)
	console.log('question from body', question)
	console.log('instructions from body', instructions)
	
	if (!question) {
		console.log('gets here')
		return res.status(400).send({Message: `bad request for params ${question}`})
	}
	console.log('question asked: ', question);
	
	let messageContent = null;
	if (client) {
		const response = await client.create({
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
		});
		const messageContent = response.choices;
		console.log(response);
		
		return res.status(200).send(messageContent).end();
	} else {
		const message = {
			Message: "Client isn't initialized"
		}
		
		return res.status(500).send(message).end();
	}
})

router.post("/save", async (req, res) => {
	const text = req.body.text;

	if (text) {
		const connection = await connectLocalPostgres();
		const query = "INSERT INTO assist."
		const save = connection.q
	} 
	
	return res.status(200).send(json).end();
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
		return  res.status(500).send(errorMessage).end();	
	}
})

module.exports = router;