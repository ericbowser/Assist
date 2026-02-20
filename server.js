const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const getLogger = require('./assistLog');
const { InitialiseClient, AssistMessage, AssistImage } = require('./client/openAiClient');
const { deepSeekChat, deepSeekImage } = require('./client/deepSeekClient');
const askClaude = require('./client/anthropicClient');
const bodyParser = require('body-parser');
const { GenerateFromTextInput } = require('./client/geminiClient');
const { textToImage: hfTextToImage, ImageModel } = require('./client/huggingFaceClient');
const { validateChatRequest, formatChatResponse, handleChatError } = require('./middleware/chatMiddleware');
const { upscaleIfNeeded } = require('./helpers/upscale');
const { askOpenRouter } = require('./client/ai/openRouterApi');

router.use(bodyParser.json());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

const _logger = getLogger();
_logger.info('Logger Initialized');

const IMAGES_DIR = path.join(__dirname, 'images');
fs.mkdir(IMAGES_DIR, { recursive: true }).catch((err) => _logger.error('images dir', err));
router.use('/images', express.static(IMAGES_DIR));

// --- LLM Chat ---

router.post('/askClaude', validateChatRequest, async (req, res) => {
  const { content } = req.body;
  _logger.info('askClaude', { content });
  const messages = content.map((x) => x.content);
  try {
    const message = await askClaude(messages);
    _logger.info('askClaude response', { message });
    if (message) return res.status(200).send(message).end();
    return res.status(400).json({ error: 'No message returned' }).end();
  } catch (error) {
    return handleChatError(error, res, _logger, 'askClaude');
  }
});

router.post('/askGemini', validateChatRequest, async (req, res) => {
  const { content } = req.body;
  _logger.info('askGemini', { content });
  try {
    const message = await GenerateFromTextInput(content);
    if (message) {
      const data = formatChatResponse(message.content[0].text, message.id);
      _logger.info('askGemini response', data);
      return res.status(200).json(data).end();
    }
    return res.status(400).json({ error: 'No message returned' }).end();
  } catch (error) {
    return handleChatError(error, res, _logger, 'askGemini');
  }
});

router.post('/askDeepSeek', async (req, res) => {
  if (!req.body?.content?.[0]) {
    return res.status(400).json({ error: 'Missing content' }).end();
  }
  const { role, content, thread } = req.body.content[0];
  _logger.info('askDeepSeek', { role, content, thread });
  try {
    const response = await deepSeekChat(content?.question ?? content);
    const currentMessage = response?.choices[0]?.message?.content;
    if (!currentMessage) {
      _logger.error('askDeepSeek unexpected response', { currentMessage });
      return res.status(400).json({ error: 'bad request' }).end();
    }
    return res.status(200).json(formatChatResponse(currentMessage, response.id)).end();
  } catch (error) {
    return handleChatError(error, res, _logger, 'askDeepSeek');
  }
});

router.post('/askChat', validateChatRequest, async (req, res) => {
  const { content } = req.body;
  _logger.info('askChat', { contentLength: content?.length });
  try {
    if (content.length < 1) {
      return res.status(400).json({ error: 'bad request for params' }).end();
    }
    for (const message of content) {
      if (!message.role || !message.content || typeof message.content !== 'string') {
        return res.status(400).json({ error: "Invalid message format. Each message must have 'role' and 'content' string." }).end();
      }
    }
    const chatClient = await InitialiseClient();
    const body = { model: 'gpt-4o-mini', messages: content, stream: false };
    const resp = await chatClient.chat.completions.create(body);
    _logger.info('askChat response', { thread: resp?.id });
    if (resp) {
      return res.status(200).json(formatChatResponse(resp.choices[0].message.content, resp.id)).end();
    }
    _logger.error('askChat no response', resp);
    return res.status(500).json({ error: 'No response' }).end();
  } catch (err) {
    return handleChatError(err, res, _logger, 'askChat');
  }
});

router.post('/askOpenRouter', validateChatRequest, async (req, res) => {
  const { content, model } = req.body;
  if (!content?.length) {
    return res.status(400).json({ error: 'Missing or empty content' }).end();
  }
  const messages = content.map((m) => ({ role: m.role || 'user', content: typeof m.content === 'string' ? m.content : String(m.content) }));
  _logger.info('askOpenRouter', { messageCount: messages.length, model });
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' }).end();
    }
    const result = await askOpenRouter(messages, model);
    _logger.info('askOpenRouter response', { thread: result.thread });
    return res.status(200).json(formatChatResponse(result.answer, result.thread)).end();
  } catch (error) {
    return handleChatError(error, res, _logger, 'askOpenRouter');
  }
});

router.post('/askAssist', async (req, res) => {
  _logger.info('askAssist', { body: req.body });
  try {
    if (!req.body) return res.status(400).json({ error: 'No message' }).end();
    const question = req?.body?.content?.question ?? null;
    const history = req?.body?.content?.history ?? null;
    const instructions = req?.body?.instructions ?? null;
    if (!question) return res.status(400).json({ error: 'bad request for params' }).end();
    const assistClient = await InitialiseClient();
    assistClient.models[0] = process.env.DEEPSEEK_REASON_MODEL;
    _logger.info('askAssist model', { model: assistClient.model });
    const response = await AssistMessage(question, history, instructions);
    _logger.info('askAssist response', { response });
    if (response) return res.status(200).send(response).end();
    return res.status(500).json({ error: 'Thread failed to run' }).end();
  } catch (err) {
    return handleChatError(err, res, _logger, 'askAssist');
  }
});

// --- Image generation ---

router.post('/deepSeekImage', async (req, res) => {
  const { content } = req.body;
  if (!content?.question) {
    return res.status(400).json({ error: 'Missing content.question' }).end();
  }
  _logger.info('deepSeekImage', { content });
  try {
    const response = await deepSeekImage(content.question);
    const data = response?.data ?? response;
    if (data) {
      _logger.info('deepSeekImage success');
      return res.status(200).send(data).end();
    }
    return res.status(400).json({ error: 'bad request' }).end();
  } catch (error) {
    return handleChatError(error, res, _logger, 'deepSeekImage');
  }
});

router.post('/generateImageDallE', async (req, res) => {
  const { content } = req.body;
  _logger.info('generateImageDallE', { content });
  try {
    const data = await AssistImage(content?.question, content?.size, content?.model);
    if (data?.answer) {
      return res.status(200).json(data).end();
    }
    return res.status(500).json({ error: 'Error generating image' }).end();
  } catch (error) {
    return handleChatError(error, res, _logger, 'generateImageDallE');
  }
});

router.post('/hfInferenceImage', async (req, res) => {
  const messages = Array.isArray(req.body) ? req.body : req.body?.content;
  const prompt = messages?.[0]?.content ?? req.body?.question ?? req.body?.prompt;
  const model = req.body?.model ?? ImageModel.Flux2Turbo;
  const inferenceSteps = req.body?.inference_steps ?? req.body?.inferenceSteps ?? req.body?.parameters?.num_inference_steps;
  const steps = inferenceSteps != null ? Math.min(50, Math.max(1, Number(inferenceSteps) || 5)) : 5;
  const parameters = { num_inference_steps: steps, height: 1280, width: 1280, ...(req.body?.parameters ?? {}) };
  parameters.num_inference_steps = steps;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt (e.g. messages[0].content)' }).end();
  }
  if (!process.env.HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN not configured' }).end();
  }
  _logger.info('hfInferenceImage', { prompt: prompt?.slice(0, 80), model, parameters });
  try {
    const image = await hfTextToImage(prompt, parameters, model);
    let buffer = Buffer.from(await image.arrayBuffer());
    buffer = await upscaleIfNeeded(buffer);
    const slug = model.split('/').pop().replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20);
    const filename = `textToImage-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.png`;
    await fs.writeFile(path.join(IMAGES_DIR, filename), buffer).catch((err) => _logger.error('save image', err));
    _logger.info('hfInferenceImage success', { filename, model, size: buffer.length });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.status(200).json({ url: `${baseUrl}/images/${filename}`, filename, model }).end();
  } catch (error) {
    const msg = error?.message ?? '';
    if (msg.includes('Invalid username or password') || msg.includes('401') || msg.includes('Unauthorized')) {
      return res.status(401).json({
        error: 'HF_TOKEN invalid or expired. Update at https://huggingface.co/settings/tokens. For FLUX.1-dev, accept the model license at https://huggingface.co/black-forest-labs/FLUX.1-dev.',
      }).end();
    }
    return handleChatError(error, res, _logger, 'hfInferenceImage');
  }
});

module.exports = router;
