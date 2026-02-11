const Path = require('path');
const server = require('./server');
const http = require("node:http");
const cors = require('cors');
const logger = require("./assistLog");
const {PORT, HOST} = require('dotenv').config().parsed;

let _logger = logger();

const swaggerJsdoc = require('swagger-jsdoc');
const express = require("express");
const {serve, setup} = require("swagger-ui-express");

const httpPort = PORT || 3003;
const httpHost = HOST || '0.0.0.0'; // Listen on all interfaces

console.log(`Server will listen on ${httpHost}:${httpPort}`);

const app = express();

// Enhanced CORS configuration for local development
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:3002',
            'http://127.0.0.1:5173',
            process.env.FRONTEND_URL
        ].filter(Boolean); // Remove undefined values
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now, tighten in production
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

app.use(cors(corsOptions));
app.use(server);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const httpServer = http.createServer(app);

let options = {
	definition: {
		schemes: ['http', 'https'],
		openapi: "3.0.0",
		info: {
			title: "E.R.B Assist API",
			version: "1.0.0",
			description: "My personal assistant using various APIs and LLMs",
			contact: {
				name: "API Support",
				url: "http://localhost:32636/swagger",
				email: "laser@new-collar.space",
			},
		},
		servers: [
			{
				url: "http://localhost:32636",
				description: "My HTTP API Documentation",
			},
		],
	},
	apis: ['./docs/AssistApi.yaml'],
}

_logger.info("server options: ", {options});
const specs = swaggerJsdoc(options);
app.use("/swagger", serve, setup(specs));

// Listen on specified host and port
httpServer.listen(httpPort, httpHost, () => {
    console.log(`✅ Server listening on http://${httpHost}:${httpPort}`);
    console.log(`📚 API Documentation: http://localhost:${httpPort}/swagger`);
});
