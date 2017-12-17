const Sequelize = require('sequelize');

const Database = require('../db.js');

const Server = Database.db.define('server', {
	guildId: {
		type: Sequelize.STRING,
		primaryKey: true,
		allowNull: false,
		unique: true
	},
	name: Sequelize.STRING,
	permitChan: Sequelize.ARRAY(Sequelize.STRING),
	altPrefix: Sequelize.STRING,
	perm3: Sequelize.ARRAY(Sequelize.STRING),
	perm2: Sequelize.ARRAY(Sequelize.STRING),
	perm1: Sequelize.ARRAY(Sequelize.STRING),
	sister: Sequelize.STRING,
	emotes: Sequelize.BOOLEAN,
	quotes: Sequelize.BOOLEAN
});

module.exports = Server;
