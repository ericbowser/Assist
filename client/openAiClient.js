const { OpenAI } = require("openai");
const config = require('dotenv').config();

let openAiClient = null;
function initialiseAssist(){
    try {
        if (!openAiClient) {
            const openAiApi = new OpenAI({
                apiKey: config.parsed.OPENAI_API_KEY,
                organization: config.parsed.ASSISTANT_ORG
            });
            if (openAiApi) {
                openAiClient = openAiApi.chat.completions;
                return openAiClient;
            } else {
                return {Message: 'Failed to retrieve api object'};
            }
        } else {
            console.log('client already initialized so just returning the one');
            return openAiClient;
        }
    }
    catch(err) {
        console.log('error: ', err);
        return err;
    }
}

module.exports = initialiseAssist;