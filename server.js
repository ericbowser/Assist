const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const getAssist = require('./Assistant');


router.post("/assist", async (req, res) => {
	const request = req.body;
	
	const image = await getAssist(request);
	console.log(image);
	const response = {
		description: 'an example image',
		image: image
	};
	
	return res.status(200).send(response).end();
})

module.exports = router;