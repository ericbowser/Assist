const {Client} = require('pg');
const path = require('path');
const config = require('../env.json');

// Change .env based on local dev or prod
const env = path.resolve(__dirname, '.env');
const options = {
	path: env
};

const connectionString =
	`postgres://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_SERVER}:${config.DB_PORT}/postgres`;

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

module.exports = {connectLocalPostgres};