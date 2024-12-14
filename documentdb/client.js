const {Client, Pool} = require('pg');
const config = require("dotenv").config();
const path = require('path');

// Change .env based on local dev or prod
const env = path.resolve(__dirname, '.env');
const options = {
	path: env
};

let client = null;

const connectionString =
	`postgres://${config.parsed.DB_USER}:${config.parsed.DB_PASSWORD}@${config.parsed.DB_SERVER}:${config.parsed.DB_PORT}/postgres`;

async function connectLocalPostgres() {
	try {
		if (!client) {
			client = new Client({
				connectionString: connectionString,
				ssl: false
			});
		}

		await client.connect();
		return client;
	} catch (e) {
		console.log(e);
	}

	return client;
}
async function connectLocalDockerPostgres() {
	try {
		const pool = new Pool({
			user: 'postgres',
			host: 'host.docker.internal',
			database: 'postgres',
			port: 5432
		});
		console.log('pool: ', pool);

		await pool.connect();
		return pool;
	} catch (e) {
		console.log(e);
	} finally {
		await pool.end();
	}
}

module.exports = {connectLocalPostgres, connectLocalDockerPostgres};