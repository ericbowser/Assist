const {OpenAI, ImageGenerateParams} = require("openai");
const config = require('dotenv').config();

let openAiClient = null;
function initialiseAssist(){
    try {
        if (!openAiClient) {
            const openAiApi = new OpenAI({
                apiVersion: "v2",
                apiKey: config.parsed.OPENAI_API_KEY,
                organization: config.parsed.OPENAI_ORG,
                debug: true,
                verbose: true,
                timeout: 60000
            });
            console.log('open ai base url', openAiApi.baseURL);
            if (openAiApi) {
                return openAiApi;
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