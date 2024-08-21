const Anthropic = require("@anthropic-ai/sdk");
let client = null;

function getAnthropicClient() {
   if (!client) {
       client = new Anthropic();
       return client;
   } else {
       console.log('Already initialized client for Claude..');
       return client;
   }
}

module.exports = getAnthropicClient;

