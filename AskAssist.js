const openAiClient = require('./client/openAiClient')

async function askAssist() {
    try {
        if(openAiClient) {
           const completion = openAiClient.completions.create({
               
           })
        } else {
            const errorMessage = {
                Message: 'Failed to ask assistant'
            }
            console.log(errorMessage);
            return errorMessage;
        }
        const assistant = openAiClient
    } catch(err) {
        console.log('error asking assistant with error: ', err);
        return err;
    }
}

module.exports = askAssist;
