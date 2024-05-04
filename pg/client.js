const {Client} = require('pg');
const config = require("dotenv").config();
const path = require('path');
const Pinecone = require("@pinecone-database/pinecone");

// Change .env based on local dev or prod
const env = path.resolve(__dirname, '.env');
const options = {
	path: env
};

/*
const connectionString =
	`postgres://${config.parsed.DB_USER}:${config.parsed.DB_PASSWORD}@${config.parsed.DB_SERVER}:${config.parsed.DB_PORT}/postgres`;
*/

async function connectLocalPostgres() {
	let client = null;
	try {
		client = new Client({
			connectionString: connectionString,
			ssl: false
		});

		await client.connect();
		return client;
	} catch (e) {
		console.log(e);
	}

	return client;
}

async function initializePinecone() {
	try {
		const pinecone = new Pinecone({
			environment: "gcp-starter",
			apiKey: config.parsed.PINECONE_API_KEY,
		});
		
		console.log('pincone obj', pinecone)
		if (!pinecone) {
			return { Message: "failed to initialize Pinecone" };
		}

		return pinecone;
	} catch (err) {
		console.log(err);
		return err;
	}
}

module.exports = {connectLocalPostgres, initializePinecone};