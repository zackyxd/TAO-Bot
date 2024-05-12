const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption(option =>
		option.setName('input')
			.setDescription('The input to echo back')
			.setRequired(true)),


	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;
		if (interaction.commandName === 'echo'){
			console.log("works");
			let reply = interaction.options.get('input').value;
			console.log(reply);
			interaction.reply(reply);
		}
			
	}
}

