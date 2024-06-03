const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("set-link-channel")
  .setDescription("Set the #channel that will be used for clan links")
  .addChannelOption(option =>
    option.setName("link-channel")
    .setDescription("Pick a channel that will be used for clan links")
    .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction){
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === "set-link-channel") {
      await interaction.deferReply({ephemeral: true});
      const guild = interaction.guild;
      const linkChannel = interaction.options.getChannel("link-channel");
      
      if (linkChannel.type !== 0){
        await interaction.editReply("Please make sure the channel is a text channel.");
        return;
      }

      const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guild.id}.json`);

      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(filePath));
      }
      catch (err){
        console.error(err);
      }

      data.linkChannel = linkChannel.id;
      fs.writeFileSync(filePath, JSON.stringify(data));

      await interaction.editReply(`The link channel has been set to <#${linkChannel.id}>`);
    }
  }
}