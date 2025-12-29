// Enhanced server.js with middleware applied
// This is a REFERENCE implementation showing best practices

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

// Import middleware
const {
    aiRateLimiter,
    generalRateLimiter,
    validateRequest,
    authenticateApiKey,
    errorHandler,
    requestLogger,
    contentSizeLimiter
} = require('./middleware/security');

// Import existing modules
const {addEmbedding, getEmbedding} = require('./Embeddings');
const {connectLocalPostgres} = require('./documentdb/client');
const {InitialiseClient, AssistMessage, AssistImage} = require("./client/openAiClient");
const {deepSeekChat, deepSeekImage} = require("./client/deepSeekClient");
const askClaude = require("./client/anthropicClient");
const {GenerateFromTextInput} = require('./client/geminiClient');
const {sendEmailWithAttachment} = require('./api/gmailSender');
const getLogger = require('./assistLog');

// Apply global middleware
router.use(contentSizeLimiter('10mb'));
router.use(bodyParser.json());
router.use(express.json());
router.use(express.urlencoded({extended: true}));
router.use(requestLogger);

const _logger = getLogger();
_logger.info("Enhanced server initialized with security middleware");

// ==========================================
// STANDARDIZED RESPONSE UTILITIES
// ==========================================

const ApiResponse = {
    success: (res, data, message = 'Success') => {
        return res.status(200).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    },
    
    error: (res, message, statusCode = 500, details = null) => {
        return res.status(statusCode).json({
            success: false,
            error: message,
            ...(details && { details }),
            timestamp: new Date().toISOString()
        });
    },
    
    created: (res, data, message = 'Resource created') => {
        return res.status(201).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }
};

// ==========================================
// AI CHAT ENDPOINTS - WITH RATE LIMITING
// ==========================================

/**
 * POST /askClaude
 * Send message to Claude (Anthropic)
 * Rate limited to prevent abuse
 */
router.post(
    "/askClaude",
    aiRateLimiter,
    validateRequest(['content']),
    async (req, res, next) => {
        try {
            const {content} = req.body;
            
            _logger.info("Claude request", {
                messageCount: content.length,
                firstMessage: content[0]?.content?.substring(0, 50)
            });

            const messages = content.map(x => x.content);
            const message = await askClaude(messages);

            if (message) {
                return ApiResponse.success(res, message, 'Claude response generated');
            } else {
                return ApiResponse.error(res, 'No response from Claude', 500);
            }
        } catch (error) {
            _logger.error('Claude error', {error: error.message});
            next(error);
        }
    }
);

/**
 * POST /askGemini
 * Send message to Google Gemini
 */
router.post(
    "/askGemini",
    aiRateLimiter,
    validateRequest(['content']),
    async (req, res, next) => {
        try {
            const {content} = req.body;
            
            _logger.info("Gemini request", {content});
            const message = await GenerateFromTextInput(content);

            if (message) {
                const data = {
                    answer: message.content[0].text,
                    thread: message.id
                };
                return ApiResponse.success(res, data, 'Gemini response generated');
            } else {
                return ApiResponse.error(res, 'No response from Gemini', 500);
            }
        } catch (error) {
            _logger.error('Gemini error', {error: error.message});
            next(error);
        }
    }
);

/**
 * POST /askDeepSeek
 * Send message to DeepSeek
 */
router.post(
    "/askDeepSeek",
    aiRateLimiter,
    validateRequest(['content.question']),
    async (req, res, next) => {
        try {
            const {content} = req.body;
            
            _logger.info("DeepSeek request", {question: content.question});
            const response = await deepSeekChat(content.question);
            const currentMessage = response?.choices[0]?.message?.content;

            if (!currentMessage) {
                _logger.error('DeepSeek returned undefined message');
                return ApiResponse.error(res, 'Invalid response from DeepSeek', 500);
            }

            const data = {
                answer: currentMessage,
                thread: response.id
            };
            
            return ApiResponse.success(res, data, 'DeepSeek response generated');
        } catch (error) {
            _logger.error('DeepSeek error', {error: error.message});
            next(error);
        }
    }
);

/**
 * POST /askChat
 * Send message to OpenAI Chat
 */
router.post(
    "/askChat",
    aiRateLimiter,
    validateRequest(['content']),
    async (req, res, next) => {
        try {
            const {content} = req.body;

            // Validate message format
            for (const message of content) {
                if (!message.role || !message.content || typeof message.content !== 'string') {
                    return ApiResponse.error(
                        res,
                        'Invalid message format. Each message must have a "role" and a "content" string.',
                        400
                    );
                }
            }

            const chatClient = await InitialiseClient();
            const body = {
                model: "gpt-4o-mini",
                messages: content,
                stream: false
            };

            const resp = await chatClient.chat.completions.create(body);
            
            if (resp) {
                const data = {
                    thread: resp.id,
                    answer: resp.choices[0].message.content
                };
                return ApiResponse.success(res, data, 'Chat response generated');
            } else {
                return ApiResponse.error(res, 'Failed to get chat response', 500);
            }
        } catch (error) {
            _logger.error('Chat error', {error: error.message});
            next(error);
        }
    }
);

// ==========================================
// IMAGE GENERATION ENDPOINTS
// ==========================================

/**
 * POST /generateImageDallE
 * Generate image using DALL-E
 */
router.post(
    '/generateImageDallE',
    aiRateLimiter,
    validateRequest(['content.question', 'content.size', 'content.model']),
    async (req, res, next) => {
        try {
            const {content} = req.body;
            
            _logger.info('Image generation request', {
                model: content.model,
                size: content.size,
                promptLength: content.question.length
            });

            const data = await AssistImage(content.question, content.size, content.model);
            
            if (data.answer) {
                return ApiResponse.success(res, data, 'Image generated successfully');
            } else {
                return ApiResponse.error(res, 'Failed to generate image', 500);
            }
        } catch (error) {
            _logger.error('Image generation error', {error: error.message});
            next(error);
        }
    }
);

// ==========================================
// DATA ENDPOINTS
// ==========================================

/**
 * POST /addEmbedding
 * Add vector embedding to database
 */
router.post(
    "/addEmbedding",
    generalRateLimiter,
    validateRequest(['text']),
    async (req, res, next) => {
        try {
            const {text} = req.body;
            const addedEmbedding = await addEmbedding(text);

            if (addedEmbedding) {
                const json = JSON.parse(addedEmbedding);
                return ApiResponse.created(res, json, 'Embedding added successfully');
            } else {
                return ApiResponse.error(res, 'Failed to add embedding', 500);
            }
        } catch (error) {
            _logger.error('Add embedding error', {error: error.message});
            next(error);
        }
    }
);

/**
 * GET /getEmbedding
 * Retrieve vector embedding
 */
router.get(
    "/getEmbedding",
    generalRateLimiter,
    async (req, res, next) => {
        try {
            const request = req.body;
            const embedding = await getEmbedding(request);

            if (embedding) {
                const parsed = JSON.parse(embedding);
                return ApiResponse.success(res, parsed, 'Embedding retrieved');
            } else {
                return ApiResponse.error(res, 'Failed to get embedding', 500);
            }
        } catch (error) {
            _logger.error('Get embedding error', {error: error.message});
            next(error);
        }
    }
);

/**
 * POST /sendEmail
 * Send email via Gmail
 */
router.post(
    '/sendEmail',
    generalRateLimiter,
    validateRequest(['name', 'email', 'subject', 'message']),
    async (req, res, next) => {
        try {
            const {name, email, subject, message} = req.body;
            
            _logger.info("Sending email", {name, email, subject});
            const messageId = await sendEmailWithAttachment(name, email, subject, message);

            if (messageId) {
                return ApiResponse.success(res, {messageId}, 'Email sent successfully');
            } else {
                return ApiResponse.error(res, 'Failed to send email', 500);
            }
        } catch (error) {
            _logger.error('Email error', {error: error.message});
            next(error);
        }
    }
);

/**
 * GET /getExamQuestions
 * Retrieve exam preparation questions
 */
router.get(
    '/getExamQuestions',
    generalRateLimiter,
    async (req, res, next) => {
        try {
            _logger.info("Fetching exam questions");
            const ps = await connectLocalPostgres();
            
            const [comptia, aws] = await Promise.all([
                ps.query("SELECT * FROM prepper.comptia_cloud_plus_questions"),
                ps.query("SELECT * FROM prepper.aws_certified_architect_associate_questions")
            ]);

            const data = {
                ...(comptia.rows.length > 0 && {comptiaQuestions: comptia.rows}),
                ...(aws.rows.length > 0 && {awsQuestions: aws.rows})
            };

            _logger.info("Questions fetched", {
                comptiaCount: comptia.rows.length,
                awsCount: aws.rows.length
            });

            return ApiResponse.success(res, data, 'Exam questions retrieved');
        } catch (error) {
            _logger.error('Fetch questions error', {error: error.message});
            next(error);
        }
    }
);

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================

router.get('/health', (req, res) => {
    return ApiResponse.success(res, {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    }, 'Service is healthy');
});

// Apply error handler last
router.use(errorHandler);

module.exports = router;
