const OpenAI = require('openai')
const config = require('dotenv').config();
const {Pinecone} = require('@pinecone-database/pinecone');

async function initializeDatabase() {
	
	try {
		const pinecone = new Pinecone({
			environment: "gcp-starter",
			apiKey: config.parsed.PINECONE_API_KEY
		});
		if (!pinecone) {
			return { errorMessage: "failed to initialize Pinecone" };
		}
		
		const indexes = await pinecone.listIndexes();
		indexes.forEach(x => console.log(x));
		
		return pinecone;
	} catch (err) {
		console.log(err);
		return err;
	}
}

async function initialiseAssist() {
	
	const assist = new OpenAI({
		apiKey: config.parsed.OPENAI_API_KEY,
		organization: config.parsed.ASSISTANT_ORG
	});
	
	console.log('open ai initialized object', assist);

	const response = await openai.beta.assistants.retrieve(config.parsed.ASSISTANT_ID);

	if (response) {
		console.log('returned response model', response.model);
	}

	return response;
}
	
	
	// const thread = await openai.beta.threads.create();
	// console.log(thread)
	// const message = await openai.beta.threads.messages.create(
	// 	thread.id,
	// 	{
	// 		role: "user",
	// 		content: "I need to prepare for interview questions. Can you help me prepare?"
	// 	}
	// );
	// console.log(message.content[0].text)
	// const run = await openai.beta.threads.runs.create(
	// 	thread.id,
	// 	{
	// 		assistant_id: response.id,
	// 		instructions: "Please help Eric prepare!"
	// 	}
	// );
	// const runStatus = await openai.beta.threads.runs.retrieve(
	// 	'thread_31HIpdxe1Z54FL3pczfvDZOH',
	// 	'run_F5oVv5s5QKuFBG8OaPpPHTYy'
	// );
	// const messages = await openai.beta.threads.messages.list(
	// 	'thread_31HIpdxe1Z54FL3pczfvDZOH',
	// );
	
	// console.log('response', messages.data)
// }

async function getEmbedding(text) {
	console.log(text);

	const textEmbeddingVector= {
		model: config.parsed.EMBEDDING_MODEL,
		input: text
	};

	const embedding = await openai.embeddings.get(textEmbeddingVector);
	if(embedding) {
		return embedding;
	} else {
		return null;
	}
}
async function addEmbedding(text) {
	console.log('text to embed', text)

	const embed= {
		model: config.parsed.EMBEDDING_MODEL,
		input: text
	};
	
	const embedding = await openai.embeddings.create(embed);
	if(embedding) {
		console.debug(embedding);
	}

	return embedding;
}

module.exports = {initialiseAssist, addEmbedding, getEmbedding, initializeDatabase};