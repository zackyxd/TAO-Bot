const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("set_ticket_channel")
  .setDescription("Set the #channel that will be used for clan links")
  
}