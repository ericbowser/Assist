const swaggerUI = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const Path = require('path');
const express = require("express");
const dotenv = require("dotenv");
const config = dotenv.config({path: Path.resolve(__dirname, '.env')});
const server = require('./server');
const http = require("node:http");

// const httpsPort = config.parsed.HTTPS_PORT || 34349;
const httpPort = config.parsed.HTTP_PORT || 8081;
// console.log('passed port to use for https', httpsPort);
console.log('passed port to use for http', httpPort);

const app = express();
app.use(server);

const httpServer = http.createServer(app);

let options = {
	definition: {
		schemes: ['http'],
		openapi: "3.0.0",
		info: {
			title: "E.R.B Assist API",
			version: "1.0.0",
			description: "My personal assistant using ChatGPT",
			contact: {
				name: "API Support",
				url: "http://localhost:8081/",
				email: "ericryanbowser@gmail.com",
			},
		},
		
		servers: [
			// {
			//     url: "https://localhost:34349/swagger",
			//     description: "My HTTPS API Documentation",
			// },
			{
				url: "http://localhost:8081/",
				description: "My HTTP API Documentation",
			},
		],
	},
	apis: ['./docs/openapi_3.yaml'],
}
const specs = swaggerJsdoc(options);
app.use("/", swaggerUI.serve, swaggerUI.setup(specs));
// httpsServer.listen(httpsPort, () => console.log(`Listening on port ${httpsPort}`));
httpServer.listen(httpPort, () => console.log(`Listening on port ${httpPort}`));