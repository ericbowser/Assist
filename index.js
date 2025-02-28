const Path = require('path');
const dotenv = require("dotenv");
const config = dotenv.config({path: Path.resolve(__dirname, '.env')});
const server = require('./server');
const http = require("node:http");

const swaggerJsdoc = require('swagger-jsdoc');
const express = require("express");
const {serve, setup} = require("swagger-ui-express");

const httpPort =  process.env.PORT || 3003;
console.log('passed port to use for http', httpPort);

const app = express();
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
const specs = swaggerJsdoc(options);
app.use("/swagger", serve, setup(specs));
httpServer.listen(httpPort, () => console.log(`Listening on port ${httpPort}`));