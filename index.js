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
app.use(cors());
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
