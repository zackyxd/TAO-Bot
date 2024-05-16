const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("set-link-channel")
  .setDescription("Set the #channel that will be used for clan links")
  .addChannelOption(option =>
    option.setName("link-channel")
    .setDescription("Pick a channel that will be used for clan links")
    .setRequired(true)),
  
  async execute(interaction){
    const guild = interaction.guild;
    const linkChannel = interaction.options.getChannel("link-channel");
    const data = {
      guildId: guild.id,
    }
  }
}