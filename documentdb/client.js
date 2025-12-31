const {Client} = require('pg');
const logger = require('../assistLog');
const {DB_USER, DB_PASSWORD, DB_HOST, DB_PORT} = require('dotenv').config().parsed;

let _logger = logger();
async function connectLocalPostgres() {
	let client = null;
	try {
		client = new Client({
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT,
      host: DB_HOST,
			ssl: false
		});

		await client.connect();
    _logger.info("Connected to: ", {client});
		return client;
	} catch (e) {
		_logger.info("Error connecting to postgres: ", {e});
    throw e;
	}
}

module.exports = {connectLocalPostgres};