const API = require("../../API.js");
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const fs = require('fs');
module.exports = {

  data: new SlashCommandBuilder()
  .setName('who-has')
  .setDescription('View who has this tag linked to them.')
  .addStringOption(option =>
    option.setName("playertag")
    .setDescription("playertag you want to check")
    .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'who-has'){
      await interaction.deferReply({ephemeral: true});
      let tag = interaction.options.get("playertag").value.toUpperCase();
      if (tag.charAt(0) !== "#") {
        tag = "#" + tag;
      }

      const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(filePath));
      }
      catch (err){
        console.error(err);
        return;
      }

      
      if (data.playersTag[tag]){
        interaction.editReply(`<@${data.playersTag[tag].userId}> has this tag \`${tag}\``);
      }
      else{
        interaction.editReply(`No one has this tag \`${tag}\` linked to them in this server.`);
      }
    }
  },
}