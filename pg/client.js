const {Client} = require('pg');
const dotenv = require("dotenv");
const path = require('path');
const pgvector = require('pgvector/pg');

// Change .env based on local dev or prod
const env = path.resolve(__dirname, '../.env');
const options = {
	path: env
};
const config = dotenv.config(options);

const connectionString =
	`postgres://${config.parsed.DB_USER}:${config.parsed.DB_PASSWORD}@${config.parsed.DB_SERVER}:${config.parsed.DB_PORT}/postgres`;

async function registerVectorType() {
	try {
		const client = await connect();
		console.log(client)
		const registerType = await pgvector.registerType(client);
		console.log('register:', registerType);
		console.log(x);
		await client.query('CREATE EXTENSION IF NOT EXISTS vector');
	}
	catch(err) {
		console.log(err);
		return err;
	}
}

async function connect() {
	let client = null;
	try {
		client = new Client({
			connectionString: connectionString,
			ssl: false
		});
		
		const connect = await client.connect();
		console.log('pg connect', connect);
		return client;
	} catch (e) {
		console.log(e);
	}
	
	return client;
}

module.exports = {connect, registerVectorType};