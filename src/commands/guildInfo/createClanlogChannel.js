const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const API = require("../../API.js");
const path = require('path');


module.exports = {
  data: new SlashCommandBuilder()
  .setName("create-clanlogs-channel")
  .setDescription("Add a channel where clan logs will be posted")
  .addStringOption(option =>
    option.setName("abbreviation")
    .setDescription("What is the abbreviation of the clan?")
    .setRequired(true))
  .addChannelOption(option =>
      option.setName('channel')
      .setDescription("Which channel will it send to?")
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction){
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'create-clanlogs-channel'){
      await interaction.deferReply({ ephemeral: true });
      const guild = interaction.guild;
      const abbrev = interaction.options.get("abbreviation").value.toLowerCase();
      const channel = interaction.options.getChannel("channel");

      if (channel.type !== 0){
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
      // data.linkChannel = linkChannel.id;
      let clanName;
      for (let checkClanName in data.clans){
        let abbreviationCheck = data.clans[checkClanName].abbreviation;
        if (abbreviationCheck === abbrev){
          clanName = checkClanName;
          break;
        }
      }
      if (clanName === undefined){
        interaction.editReply("This abbreviation has not be created yet.");
        return null;
      }

      if (!data.clans[clanName].clanlogsChannel){
        data.clans[clanName].clanlogsChannel = channel.id;;
      }
      if (!data.clans[clanName].clanlogsChannel){
        data.clans[clanName].clanInfo = {};
      } 

      data.clans[clanName].clanInfo = {};
      fs.writeFileSync(filePath, JSON.stringify(data));
      await interaction.editReply(`The channel <#${channel.id}> will now post clan logs for \`${clanName}\``);
    }
  }
      
}