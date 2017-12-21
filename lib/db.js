const Sequelize = require('sequelize');
const config = require('../config.json');
const log = require('./log.js')('Database');

const database = new Sequelize('ocel', 'ocel', config.dbPass, {
	host: 'localhost',
	dialect: 'postgres',
	pool: {
		max: 5,
		min: 0,
		idle: 10000
	},
	logging: log.debug
});

class Database {
	static get db() {
		return database;
	}

	static start() {
		database.authenticate()
			.then(() => log.info('Connection to database has been established successfully.'))
			.then(() => log.verbose('Synchronising database...'))
			.then(() => database.sync()
				.then(() => log.info('Done Synchronising database!'))
				.catch(error => log.error(`Error synchronising the database: \n${error}`))
			)
			.catch(err => {
				log.error(`Unable to connect to the database: \n${err}`);
				log.error(`Try reconnecting in 5 seconds...`);
				setTimeout(() => Database.start(), 5000);
			});
	}
}

module.exports = Database;