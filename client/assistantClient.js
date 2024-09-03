const initialiseAssist = require('./openAiClient');  // Ensure correct path
const openAiClient = initialiseAssist();
const dotenv = require('dotenv');
const config = dotenv.config();

async function assistantClient() {
    const assistant = openAiClient.createCompletion({
        model: "text-davinci-003",
        prompt: "You are an AI assistant",
    });

    return assistant;
}

module.exports = assistantClient; 