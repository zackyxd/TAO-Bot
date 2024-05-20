const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,  } = require('discord.js');
//const API = require("../API.js");
const path = require('path');
const fs = require('fs');


module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()){
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
				} else {
					await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				}
			}
		}
		else if (interaction.isButton()){

			if (interaction.customId.startsWith('confirm')){
				await interaction.deferUpdate();
				const parts = interaction.customId.split('@_@');
				const userId = parts[1];
				const nickname = parts[2];
				const playertag = parts[3];

				console.log(parts);
				const user = await interaction.guild.members.cache.get(userId);

				const filePath = path.join(__dirname, '..', '..', 'guildInfo', `${interaction.guild.id}.json`);
				let data = [];
				try {
					data = JSON.parse(fs.readFileSync(filePath));
				}
				catch (err){
					console.error(err);
				}

				// get member that clicked the button 
				const member = await interaction.guild.members.fetch(interaction.user.id);
				// check that the member that clicked button has staff role
				if (!member.roles.cache.has(data.staffRole)){
					await interaction.followUp({ content: "You don't have permission to link accounts, please wait for one of the coleaders.", ephemeral: true });
					return;
				}

				try {
					// change name
					newConfirm = new ButtonBuilder()
						.setCustomId('confirmed')
						.setLabel("Linked!")
						.setDisabled(true)
						.setStyle(ButtonStyle.Success);

					const confirmRow = new ActionRowBuilder()
						.addComponents(newConfirm);
					console.log(user);
					console.log(nickname);
					// setting nickname
					await user.setNickname(nickname);
					await interaction.message.edit({ components: [confirmRow] });

				} catch (error) {
					// error changing or linking
					console.log(error);
					const newError = new ButtonBuilder()
						.setCustomId('Error')
						.setLabel("Error Linking")
						.setDisabled(true)
						.setStyle(ButtonStyle.Danger);

					const errorRow = new ActionRowBuilder()
						.addComponents(newError);

					interaction.message.edit({ components: [errorRow] })
					await interaction.followUp({ content: "There was a problem with linking or changing this user's name. Likely a permission issue if their role is above the bot.", ephemeral: true });
				}
			}
		}
	},
};