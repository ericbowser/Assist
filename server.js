const express = require('express');
const router = express.Router();
const {addEmbedding, initialiseAssist, getEmbedding, initializeDatabase} = require('./Assistant');
const {registerVectorType} =require('./pg/client');
const {config} = require("dotenv");

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post("/generalAssist", async (req, res) => {
	
	let assistant;
	assistant = await initialiseAssist();
	if (assistant) {
		const json = JSON.parse(assistant);
		return res.status(200).send(json).end();
	} else {
		const errorMessage = {
			error: `Failed to add embedding ${text}`
		}
		
		return res.status(500).send(errorMessage).end();
	}
})

router.post("/initializeDatabase", async (req, res) => {

	const db = await initializeDatabase();
	if (db) {
		const json = db.toString();
		return res.status(200).send(db.index()).end();
	} else {
		const errorMessage = {
			error: `Failed to init db`
		}

		return res.status(500).send(errorMessage).end();
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
		return  res.status(500).send(errorMessage).end();	
	}
})

router.post('/enablePgVector', async (req, res) => {
	const request = req.body;
	const result = await registerVectorType();
	
	if (!result) {
		console.log('failed to register type');
		
	} else {
		console.log('result', result);
		
	}
	
	return res.status(200).send(res.json()).end();
});

module.exports = router;