// Enhanced middleware for request validation, rate limiting, and security

const rateLimit = require('express-rate-limit');
const logger = require('../assistLog');
const crypto = require('crypto');

const _logger = logger();

/**
 * Rate limiting middleware to prevent API abuse
 * Apply to expensive endpoints like AI calls
 */
const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per window
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        _logger.warn('Rate limit exceeded', { 
            ip: req.ip, 
            path: req.path 
        });
        res.status(429).json({
            error: 'Too many requests',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

/**
 * General rate limiter for standard endpoints
 */
const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please slow down.'
});

/**
 * Request validation middleware
 * Validates required fields in request body
 */
const validateRequest = (requiredFields = []) => {
    return (req, res, next) => {
        const missingFields = requiredFields.filter(field => {
            // Support nested field checking (e.g., 'content.question')
            const keys = field.split('.');
            let value = req.body;
            
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined || value === null || value === '') {
                    return true;
                }
            }
            return false;
        });

        if (missingFields.length > 0) {
            _logger.warn('Validation failed', { 
                missingFields, 
                path: req.path 
            });
            return res.status(400).json({
                error: 'Validation failed',
                missingFields,
                message: `Required fields missing: ${missingFields.join(', ')}`
            });
        }

        next();
    };
};

/**
 * API Key authentication middleware
 * Checks for valid API key in headers
 */
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        _logger.warn('Missing API key', { 
            ip: req.ip, 
            path: req.path 
        });
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid API key in x-api-key header'
        });
    }

    // In production, validate against database or environment variable
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
    if (!validApiKeys.includes(apiKey)) {
        const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8);
        _logger.warn('Invalid API key', { 
            ip: req.ip, 
            path: req.path,
            apiKeyHash
        });
        return res.status(403).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
        });
    }

    next();
};

/**
 * Error handling middleware
 * Standardized error responses
 */
const errorHandler = (err, req, res, next) => {
    _logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    // Don't leak error details in production
    const isDev = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(isDev && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        path: req.path
    });
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        _logger.info('Request completed', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        });
    });
    
    next();
};

/**
 * Content size limiter
 * Prevents large payload attacks
 */
const contentSizeLimiter = (maxSize = '10mb') => {
    return require('express').json({ limit: maxSize });
};

module.exports = {
    aiRateLimiter,
    generalRateLimiter,
    validateRequest,
    authenticateApiKey,
    errorHandler,
    requestLogger,
    contentSizeLimiter
};
