const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../assistLog');

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
    console.log(process.env.CLAUDE_MODEL)
    const response = await _client.messages.create({
      stream: false,
      model: process.env.CLAUDE_MODEL,
      temperature: 0,
      messages: prompts,
      max_tokens: 1000,
    });


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
        baseURL: process.env.CLAUDE_MESSAGES_URL,
        apiKey: process.env.CLAUDE_AI_KEY,
      });
    }

    return _client;
  } catch (err) {
    _logger.error('Error getting anthropic client', {err});
    throw err;
  }
}

module.exports = askClaude;
