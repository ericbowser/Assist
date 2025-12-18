const openAiClient = require('./client/openAiClient')

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

async function addEmbedding(embeddingText) {
	console.log('text to embed', embeddingText)

	const embed= {
		model: config.parsed.EMBEDDING_MODEL,
		input: embeddingText
	};
	
	try {
		const embedding = await openAiClient.embeddings.create(embed);
		console.log(embedding);
		return embedding;
	} catch(err) {
		console.log("failed to embed with error: ", err);
		return err;
	}
}

module.exports = {addEmbedding, getEmbedding};