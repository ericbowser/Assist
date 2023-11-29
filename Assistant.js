const OpenAI = require("openai");
const {options} = require("pg/lib/defaults");
const config = require('dotenv').config();

async function getAssist(key) {
	console.log(config);
	const openai = new OpenAI({
		apiKey: key,
		organization: "org-8tTqfyzCfx2lAhM8NkNGw2eQ"
	});
	console.log(openai.organization)
	
	// const response = await openai.beta.assistants.retrieve("asst_wx2OOaLkWdqoNe3mtx8fw9Y8");
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
	
	console.log('response', messages.data)
}

module.exports = getAssist;