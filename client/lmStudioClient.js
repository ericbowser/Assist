const axios = require('axios');

const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_BASE_URL || 'http://10.0.0.3:6234/';
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY;

/**
 * @param {Array<{ role: string; content: string }>} messages
 * @param {{ model?: string; max_tokens?: number; temperature?: number }} [opts]
 * @returns {Promise<{ answer: string; thread?: string }>}
 */
async function askLMStudio(messages, opts = {}) {
  const model = opts.model || '';
  const max_tokens = opts.max_tokens ?? 500;
  const temperature = opts.temperature ?? 0.7;
  const headers = { 'Content-Type': 'application/json' };
  if (LM_STUDIO_API_KEY && LM_STUDIO_API_KEY.trim()) {
    headers['Authorization'] = `Bearer ${LM_STUDIO_API_KEY}`;
  }
  const response = await axios.post(
    `${LM_STUDIO_BASE_URL}/v1/chat/completions`,
    { model, messages, max_tokens, temperature, stream: false },
    { headers, timeout: 60000 }
  );
  const choice = response?.data?.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('LM Studio returned no content');
  }
  return {
    answer: choice.message.content.trim(),
    thread: response?.data?.id,
  };
}

module.exports = { askLMStudio };
