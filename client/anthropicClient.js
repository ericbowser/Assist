const {Anthropic} = require('@anthropic-ai/sdk');
const config = require('dotenv').config();
const logger = require('../assistLog');

let _logger = logger();
let _client = null;
let _thread = null;

async function askClaude(content = [{}]) {
  try {
    if (!_client) {
      _client = await getAnthropicClient();
    } else {
      _logger.info('Already initialized client for Claude..');
    }

    _logger.info("Messages for Claude:  ", {});

    // Make request with messages array
    const response = await _client.messages.create({
      model: config.parsed.CLAUDE_MODEL,
      system: "You are a helpful assistant who helps with business and development questions.",
      messages: content,
      max_tokens: 4096
    });
    
    // Return response and updated history
    return {
      response,
      thread: response.id,
      answer: response.content[0].text,
      updatedHistory: [
        ...content,
        {role: "assistant", content: response.content[0].text}
      ]
    };
  } catch (error) {
    _logger.error('Error calling Claude:', {error});
    throw error;
  }
}

function getAnthropicClient() {
  try {
    if (!_client) {
      _client = new Anthropic({
        baseURL: config.parsed.CLAUDE_MESSAGES_URL,
        apiKey: config.parsed.ANTHROPIC_API_KEY,
      });
    }

    return _client;
  } catch (err) {
    _logger.error('Error getting anthropic client', {err});
    throw err;
  }
}

module.exports = askClaude;

