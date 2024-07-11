const axios = require('axios');
const config = require('dotenv').config();

async function askClaude(prompt) {
    try {
        const response = await axios.post(config.parsed.CLAUDE_MESSAGES_URL, {
            model: config.parsed.CLAUDE_MODEL,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.parsed.ANTHROPIC_API_KEY
            }
        });

        return response.data.content[0].text;
    } catch (error) {
        console.error('Error calling Claude:', error);
        throw error;
    }
}

module.exports = askClaude;