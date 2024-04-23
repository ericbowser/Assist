const openAiClient = require('./client/openAiClient')

async function askAssist(question) {
    try {
        console.log('client');
        if(openAiClient) {
           const completion = openAiClient.create({
               Message: question
           });
           return completion;
        } else {
            const errorMessage = {
                Message: 'Failed to ask assistant'
            }
            console.log(errorMessage);
            return errorMessage;
        }
    } catch(err) {
        console.log('error asking assistant with error: ', err);
        return err;
    }
}

module.exports = askAssist;
