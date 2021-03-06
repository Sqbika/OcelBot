exports.data = {
	name: 'Twitter Embeds',
	nick: 'twit',
	command: 'twit',
	description: 'Creates embeds for tweets.',
	group: 'embeds',
	author: 'Matt C: matt@artemisbot.uk',
	syntax: 'twit [tweet id/link]',
	permissions: 0,
	anywhere: true
};

const Twit = require('twit');
const Discord = require('discord.js');
const log = require('../lib/log.js')(exports.data.name);
const config = require('../config.json');

exports.func = async (msg, args) => {
	msg.channel.startTyping();
	try {
		if (!args[0]) {
			return msg.reply(`You haven't provided enough arguments. The proper syntax for "${this.data.name}" is \`${this.data.syntax}\`.`);
		}
		const options = {
			id: args[0].split('/').slice(-1).pop() || args[0]
		};
		const T = new Twit(config.WTTwitter);
		const tweet = (await T.get('statuses/show/:id', {
			id: options.id
		})).data;
		if (!tweet.errors) {
			const embed = new Discord.RichEmbed({
				color: 0x00ACED,
				author: {
					name: `${tweet.user.name} - @${tweet.user.screen_name}`,
					icon_url: tweet.user.profile_image_url,
					url: `https://twitter.com/${tweet.user.screen_name}/status/${options.id}`
				},
				timestamp: (new Date(tweet.created_at)).toISOString(),
				description: tweet.text,
				fields: [
					{
						name: 'Retweets',
						value: tweet.retweet_count,
						inline: true
					},
					{
						name: 'Likes',
						value: tweet.favorite_count,
						inline: true
					}
				],
				footer: {
					text: `Twitter`,
					icon_url: 'https://cdn.artemisbot.uk/img/twitter.png'
				}
			});
			msg.channel.send('', {embed})
            .catch(log.error);
		} else if (tweet.errors[0].code !== 179) {
			msg.reply('Tweet was made by a protected account.').then(m => {
				m.delete(2000);
				msg.delete(2000);
			});
		}
	} catch (err) {
		msg.reply(`Something went wrong with the Twitter API: ${err.stack}`);
	}
	msg.channel.stopTyping(true);
};
