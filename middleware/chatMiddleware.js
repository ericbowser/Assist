/**
 * Unified validation, response formatting, and error handling for chat routes.
 */

function validateChatRequest(req, res, next) {
  if (!req.body || !req.body.content) {
    return res.status(400).json({ error: 'Missing required content' });
  }
  next();
}

function formatChatResponse(answer, thread) {
  return { answer, thread };
}

function handleChatError(error, res, logger, context) {
  logger.error(`${context} error`, error);
  return res.status(500).json({
    error: error?.message ?? `Error in ${context}`,
  });
}

module.exports = {
  validateChatRequest,
  formatChatResponse,
  handleChatError,
};
