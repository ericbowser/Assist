const getAnthropicClient = require('../client/anthropicClient');
const config = require("dotenv").config();

async function askClaude(prompt) {
    try {
        let response;
        const claudeClient = getAnthropicClient();
        if (claudeClient) {
            const messages = [
                {"role": "user", "content": prompt}
            ];
            response = await claudeClient.messages.create({
                max_tokens: 1000,
                model: config.parsed.CLAUDE_MODEL,
                temperature: 0,
                messages: messages
            });
            return response;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error calling Claude:', error);
        throw error;
    }
}

module.exports = askClaude;