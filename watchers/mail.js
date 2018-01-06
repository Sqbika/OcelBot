// Modules & Initialisation
exports.data = {
	name: 'Mail Listener',
	command: 'mail',
	description: 'Listens to mail from specified address'
};

const MailListener = require('mail-listener2');
const Discord = require('discord.js');
const Twit = require('twit');

const MailWatch = require('../lib/models/mailwatch');
const log = require('../lib/log.js')(exports.data.name);
const config = require('../config.json');

const T = new Twit(config.WTTwitter);
const ml = new MailListener({
	username: config.mailUsername,
	password: config.mailPassword,
	host: config.mailHost,
	port: 993, // Imap port
	tls: true,
	debug: log.debug, // Or your custom function with only one incoming argument. Default: null
	mailbox: 'INBOX', // Mailbox to monitor
	searchFilter: ['UNSEEN'], // The search filter being used after an IDLE notification has been retrieved
	markSeen: false, // All fetched email willbe marked as seen and not fetched next time
	mailParserOptions: {
		streamAttachments: true
	}, // Options to be passed to mailParser lib.
	attachments: false
});

exports.watcher = bot => {
	// Startup process for watcher
	this.disable();
	ml.start();
	ml.on('server:connected', () => {
		log.verbose(`${exports.data.name} has initialised successfully and connected to the IMAP server.`);
	});
	ml.on('server:disconnected', () => {
		log.error(`Bot has disconnected from IMAP server.`);
		ml.start();
	});
	ml.on('error', err => {
		log.error(`Issue with IMAP: ${err.stack}`);
	});
	ml.on('mail', async (mail, seqno, attributes) => {
		try {
			log.debug(`New email received from "${mail.from[0].name}" with subject "${mail.subject}".`);
			const mailWatchers = await MailWatch.findAll({where: {address: mail.from[0].address}});
			// Console.log(mailWatchers);
			if (mailWatchers) {
				ml.imap.addFlags(attributes.uid, '\\Seen', err => {
					if (!err) {
						log.debug('Mail has been set as read.');
					}
				});
				log.info(`New email received from "${mail.from[0].name}" with subject "${mail.subject}".`);
				const embed = new Discord.RichEmbed({
					author: {
						name: `A new email has been received from ${mail.from[0].name}`,
						icon_url: 'https://cdn.artemisbot.uk/img/watchingtitan.png'
					},
					description: `**Subject:** ${mail.subject}`,
					color: 0x993E4D,
					footer: {
						text: 'Sent at',
						icon_url: 'https://cdn.artemisbot.uk/img/mail.png'
					},
					timestamp: mail.date
				});
				if (mail.from[0].address === 'info@wakingtitan.com') {
					await T.post('statuses/update', {
						status: mail.subject.length <= (216 - mail.from[0].name.length) ? `A new email has been received from ${mail.from[0].name} with subject ${mail.subject}" #WakingTitan` : `A new email has been received from ${mail.from[0].name} with subject "${mail.subject.slice(0, 215 - mail.from[0].name.length)}…" #WakingTitan`
					});
				}
				await Promise.all(mailWatchers.map(watch =>
					// Send embed to watching discord channels
					bot.channels.get(watch.channelID).send('', {
						embed
					})
				));
			}
		} catch (err) {
			log.error(`Something went wrong: ${err}`);
		}
	});
};

exports.start = async (msg, bot, args) => {
	// Process for new channel/watched item
	try {
		if (args.length < 0) {
			return msg.reply('Please add an email address.');
		}
		await MailWatch.sync();
		if (await MailWatch.findOne({where: {address: args[0], channelID: msg.channel.id}})) {
			return msg.reply(`I am already watching ${args[0]} in this channel.`);
		}
		MailWatch.create({
			address: args[0],
			channelID: msg.channel.id
		});
		log.info(`Now watching for mail from "${args[0]}" in ${msg.channel.name} on ${msg.guild.name}.`);
		await msg.reply(`Now watching for mail from "${args[0]}" in this channel.`);
	} catch (err) {
		msg.reply('Couldn\'t watch this address! Check the logs.');
		log.error(`Couldn't start watching a new stream: ${err}`);
	}
};

exports.stop = (msg, bot, args) => {
	// Process for removing channel/watched item
};

exports.disable = () => {
	try {
		ml.stop();
	} catch (err) {
		log.error(`Failed to stop listener: ${err}`);
	}
};
