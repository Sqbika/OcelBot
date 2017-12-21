exports.data = {
	name: 'Eval Command',
	command: 'eval',
	description: 'Sends an eval',
	group: 'system',
	syntax: 'eval [script]',
	author: 'Matt C: matt@artemisbot.uk',
	permissions: 4
};

const log = require('../lib/log.js')(exports.data.name);

const clean = text => {
	if (typeof text === 'string') {
		return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203));
	}
	return text;
};

exports.func = async (msg, args) => {
	log.info(`${msg.member.displayName} (${msg.author.username}#${msg.author.discriminator}) has used eval in #${msg.channel.name} on ${msg.guild.name}.`);
	const code = args.join(' ');
	try {
		let evaled = eval(code); // eslint-disable-line no-eval
		if (typeof evaled !== 'string') {
			evaled = require('util').inspect(evaled);
		}
		await msg.channel.send('```xl\n' + clean(evaled) + '\n```').catch(err => log.error(err));
	} catch (err) {
		await msg.channel.send('`ERROR` ```xl\n' + clean(err) + '\n```').catch(err => log.error(err));
	}
};
