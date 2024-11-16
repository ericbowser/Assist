const config = require('dotenv').config();
const {openAiClient} = require('./client/openAiClient')

async function getEmbedding(text) {
	console.log('embedding vectors: ', text);

	const textEmbeddingVector= {
		model: config.parsed.EMBEDDING_MODEL,
		input: text
	};
	
	try {
		if (openAiClient) {
			const embedding = await openAiClient.embeddings.get(textEmbeddingVector);
			console.log(embedding)
			return embedding;
		} else {
			return {
				Message: `Not Initialized for model ${config.parsed.EMBEDDING_MODEL}`
			}
		}
	} catch(err) {
		console.log("failed to get embedding with error: ", err);
		return err;
	}
}

module.exports = { getEmbedding};