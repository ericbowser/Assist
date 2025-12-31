const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../assistLog');
const {CLAUDE_MODEL, CLAUDE_API_KEY, CLAUDE_MESSAGES_URL} = require('dotenv').config().parsed;

let _logger = logger();
let _client = null;
let _thread = null;

async function askClaude(prompts = []) {
  try {
    if (!_client) {
      _client = await getAnthropicClient();
    } else {
      _logger.info('Already initialized client for Claude..');
    }

    _logger.info("Messages for Claude:  ", {prompts});

    // Make request with messages array
    _logger.info("Claude Model: ", {CLAUDE_MODEL})
    const response = await _client.messages.create({
      stream: false,
      model: CLAUDE_MODEL,
      max_tokens: 20000,
      temperature: 1,
      messages: prompts
    });

    _logger.info("Claude response: ", {response});
    // Return response and updated history
    return {
      response,
      thread: response.id,
      answer: response.content[0].text,
      updatedHistory: [
        ...prompts,
        {role: "assistant", content: response.content[0].text}
      ]
    }
  } catch (error) {
    _logger.error('Error calling Claude:', {error});
    throw error;
  }
}

function getAnthropicClient() {
  try {
    if (!_client) {
      _client = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
        baseUrl: CLAUDE_MESSAGES_URL,
        
      });
    }

    return _client;
  } catch (err) {
    _logger.error('Error getting anthropic client', {err});
    throw err;
  }
}

module.exports = askClaude;
