const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const getAssist = require('./Assistant');
const {registerVectorType} =require('./pg/client');

router.post("/assist", async (req, res) => {
	const request = req.body;
	
	const assistant = await getAssist(request);
	console.log(assistant);
	
	return res.status(200).send(assistant).end();
})

router.post('/enablePgVector', async (req, res) => {
	const request = req.body;
	const result = await registerVectorType(request);
	if (!result) {
		console.log('failed to register type');
		
	} else {
		console.log('result', result);
		
	}
	
	const response = {
		Status: 200,
		Message: "Success"
	};
	
	return req.Status(200).send(response).end();
});

module.exports = router;