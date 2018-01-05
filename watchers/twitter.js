exports.data = {
	name: 'Twitter Watcher',
	nick: 'twitter',
	command: 'twitter',
	description: 'Creates a watcher for tweets.',
	author: 'Matt C: matt@artemisbot.uk'
};

const Twit = require('twit');
const Discord = require('discord.js');
const he = require('he');
const chalk = require('chalk');
const config = require('../config.json');
const log = require('../lib/log')(exports.data.name);
const TwitterWatch = require('../lib/models/twitterwatch');

const T = new Twit(config.twitter);

let botStream;

const getFollowList = watchers => {
	const follow = [];
	watchers.forEach(watch => {
		if (!follow.includes(watch.twitterID)) {
			follow.push(watch.twitterID);
		}
	});
	return follow.join(', ');
};

const startStream = async bot => {
	await TwitterWatch.sync();
	let watchers = await TwitterWatch.all();
	try {
		botStream.stop();
	} catch (err) {
		// Do nothing
	}
	botStream = T.stream('statuses/filter', {
		follow: getFollowList(watchers)
	});
	botStream.on('connected', () => {
		log.verbose('Connected to Twitter stream API.');
	});
	botStream.on('tweet', async tweet => {
		const embed = new Discord.RichEmbed({
			color: 0x00ACED,
			author: {
				name: `${tweet.user.name} - @${tweet.user.screen_name}`,
				icon_url: tweet.user.profile_image_url,
				url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
			},
			description: he.decode(tweet.text),
			timestamp: (new Date(tweet.created_at)).toISOString(),
			footer: {
				text: `\u200B`,
				icon_url: 'https://cdn.artemisbot.uk/img/twitter.png'
			}
		});
		watchers = await TwitterWatch.findAll({where: {twitterID: tweet.user.id_str}});
		if (watchers.length > 0) {
			log.verbose(`User ${tweet.user.screen_name} has just tweeted at ${tweet.created_at}.`);
			watchers.forEach(watch => {
				if (!tweet.in_reply_to_user_id || watch.replies) {
					bot.channels.get(watch.channelID).send('', {embed});
				}
			});
		}
	});
	botStream.on('error', err => {
		log.error(`Twitter Stream has exited with error: ${err}`);
		this.watcher(bot);
	});
};

// Handles adding and removing of followed Twitter accounts
exports.start = async (msg, bot, args) => {
	try {
		await TwitterWatch.sync();
		let name;
		let userId;
		if (!args[0]) {
			return msg.reply('Please include a twitter account name/id to watch.');
		}
		if (args[0][0] === '@') {
			args[0] = args[0].substr(1);
		}
		try {
			if (args[0].match(/^[0-9]+$/)) {
				userId = args[0];
				name = (await T.get('users/show', {user_id: args[0]})).data.screen_name;
			} else {
				name = args[0];
				userId = (await T.get('users/show', {screen_name: args[0]})).data.id_str;
			}
			if (!name || !userId) {
				return msg.reply('Selected twitter user does not exist.');
			}
		} catch (err) {
			log.error(`Initialisation of twitter stream failed: ${err}`);
		}
		if (await TwitterWatch.findOne({where: {twitterID: userId, channelID: msg.channel.id}})) {
			return msg.reply(`I am already watching @${name} in this channel.`);
		}
		TwitterWatch.create({
			twitterID: userId,
			twitterName: name,
			channelID: msg.channel.id,
			replies: args[1]
		});
		log.info(`Now watching ${name} in #${msg.channel.name} on ${msg.guild.name}.`);
		await msg.reply(`I am now watching ${name} in this channel.`);
		this.startStream(bot);
	} catch (err) {
		msg.reply('Couldn\'t watch this user! Check the logs.');
		log.error(`Couldn't start watching a new user: ${err}`);
	}
};

exports.stop = async (msg, bot, args) => {
	try {
		await TwitterWatch.sync();
		let userId;
		if (!args[0]) {
			return msg.reply('Please include a twitter account name/id to stop watching.');
		}
		if (args[0][0] === '@') {
			args[0] = args[0].substr(1);
		}
		try {
			if (!args[0].match(/^[0-9]+$/)) {
				userId = (await T.get('users/show', {screen_name: args[0]})).data.id_str;
			}
		} catch (err) {
			log.error(`Ending of twitter stream follow failed: ${err}`);
		}
		const watch = await TwitterWatch.findOne({where: {twitterID: userId, channelID: msg.channel.id}});
		if (!watch) {
			return msg.reply(`I am not watching Twitter user ${args[0]} in this channel.`);
		}
		await watch.destroy();
		log.info(`No longer watching ${args[0]} in #${msg.channel.name} on ${msg.guild.name}.`);
		await msg.reply(`I am no longer watching ${args[0]} in this channel.`);
		this.startStream(bot);
	} catch (err) {
		msg.reply('Couldn\'t stop watching this user! Check the logs.');
		log.error(`Couldn't stop watching a user: ${err}`);
	}
};

// Watches the specified twitter accounts
exports.watcher = async bot => {
	startStream(bot);
	log.verbose(chalk.green(`${exports.data.name} has initialised successfully.`));
};

exports.disable = () => {
	botStream.stop();
};
