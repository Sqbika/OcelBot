exports.data = {
	name: 'Twitch Embeds',
	nick: 'twitch',
	command: 'twitch',
	description: 'Creates embeds for twitch channels.',
	group: 'embeds',
	author: 'Matt C: matt@artemisbot.uk',
	syntax: 'twitch [channel link/name/id]',
	permissions: 0,
	anywhere: true
};

const moment = require('moment');
const request = require('request-promise-native');
const humanize = require('humanize-duration');
const Discord = require('discord.js');
const config = require('../config.json');

const log = require('../lib/log.js')(exports.data.name);

exports.func = async (msg, args) => {
	try {
		msg.channel.startTyping();
		let channel;
		if (!args[0]) {
			return msg.reply(`You haven't provided enough arguments. The proper syntax for "${this.data.name}" is \`${this.data.syntax}\`.`);
		}
		const options = {
			id: args[0].split('/').slice(-1).pop() || args[0]
		};
		const r = request.defaults({
			baseUrl: `https://api.twitch.tv/kraken/`,
			headers: {
				Accept: 'application/vnd.twitchtv.v5+json',
				'Client-ID': config.twitch_clientid
			},
			json: true
		});
		if (!(options.id.match(/^[0-9]+$/))) {
			const userSearch = await r(`/users?login=${options.id}`);
			if (userSearch._total > 0) {
				options.id = userSearch.users[0]._id;
			} else {
				return msg.reply('Not a real twitch user.');
			}
			msg.channel.stopTyping();
		}
		const stream = (await r(`/streams/${options.id}`)).stream;
		if (stream) {
			channel = stream.channel;
		} else {
			channel = await r(`/channels/${options.id}`);
		}
		const embed = new Discord.RichEmbed({
			color: 6570405,
			author: {
				icon_url: channel.logo,
				name: `${channel.display_name} on Twitch.tv`,
				url: channel.url
			},
			fields: [
				{
					name: 'Status',
					value: channel.status || 'None',
					inline: false
				},
				{
					name: 'Game',
					value: channel.game || 'None',
					inline: true
				},
				{
					name: 'Followers',
					value: channel.followers,
					inline: true
				}
			],
			footer: {
				icon_url: 'https://cdn.artemisbot.uk/img/twitch.png',
				text: `Powered by the Twitch API. Took ${moment().diff(msg.createdAt)} ms.`
			}
		});
		if (stream) {
			embed.setThumbnail(stream.preview.medium);
			embed.addField('Uptime', humanize(moment().diff(moment(stream.created_at)), {
				round: true
			}), true);
			embed.addField('Viewers', stream.viewers, true);
		}
		msg.channel.stopTyping(true);
		await msg.channel.send('', {embed});
	} catch (err) {
		msg.reply('Couldn\'t get requested Twitch user/stream.');
		log.error(`Failed to get Twitch user/stream: ${err.stack}`);
		msg.channel.stopTyping(true);
	}
};
