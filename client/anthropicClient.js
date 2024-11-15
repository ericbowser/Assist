const Anthropic = require('@anthropic-ai/sdk');
const config = require('dotenv').config();

let claudeClient = null;

async function askClaude(prompt) {
  try {
    const client = getAnthropicClient();
    const messages = [
      {"role": "user", "content": prompt}
    ];
    console.log("messages: ", messages[0].content)
    const response = await client.messages.create({
      max_tokens: 1000,
      model: config.parsed.CLAUDE_MODEL,
      temperature: 0,
      messages: messages
    });
    return response;
  } catch (error) {
    console.error('Error calling Claude:', error);
    throw error;
  }
}

function getAnthropicClient() {
  if (!claudeClient) {
    claudeClient = new Anthropic({
      model: config.parsed.CLAUDE_MODEL,
      apiKey: config.parsed.ANTHROPIC_API_KEY,
      verbose: true,
      timeout: 60000,
    });
    return claudeClient;
  } else {
    console.log('Already initialized client for Claude..');
    return claudeClient;
  }
}

module.exports = askClaude;

