const DEFAULT_MODEL = 'openai/gpt-4o-mini';

/**
 * @param {Array<{ role: string; content: string }>} messages
 * @param {string} [model]
 * @returns {Promise<{ answer: string; thread?: string }>}
 */
async function askOpenRouter(messages, model = DEFAULT_MODEL) {
  const { OpenRouter } = await import('@openrouter/sdk');
  const openRouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const result = await openRouter.chat.send({
    chatGenerationParams: {
      model: model || DEFAULT_MODEL,
      messages,
      stream: false,
    },
  });
  const choice = result?.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error('OpenRouter returned no content');
  }
  return {
    answer: choice.message.content,
    thread: result.id,
  };
}

module.exports = { askOpenRouter };
