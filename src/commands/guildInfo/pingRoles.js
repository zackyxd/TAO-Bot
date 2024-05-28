const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const API = require("../../API.js");
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("add-ping-role")
  .setDescription("Add a role that members can ping and will add a check to them.")

  .addRoleOption(option =>
    option.setName("role-to-ping")
    .setDescription("Which role will be pinged?")
    .setRequired(true))
  .addStringOption(option =>
    option.setName('icon')
    .setDescription('Which text icon will be used for this role? Use unicode emojis.')
    .setRequired(true))
  .addStringOption(option => 
    option.setName("description")
    .setDescription("What is one word to describe this?")
    .setRequired(true))
  .addStringOption(option =>
    option.setName('time-until-pings')
    .setDescription("What time should it start pinging? Time is EST")
    .setRequired(true)
    .addChoices(
      { name: 'N/A', value: "N/A" },
      { name: '8:30PM', value: "20:30" },
      { name: '9:00PM', value: "21:00" },
      { name: '9:30PM', value: "21:30" },
      { name: '10:00PM', value: "22:00" },
      { name: '10:30PM', value: "22:30" },
      { name: '11:00PM', value: "23:00" },
      { name: '11:30PM', value: "23:30" },
      { name: '12:00AM', value: "00:00" },
      { name: '12:30AM', value: "00:30" },
    )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction){
    await interaction.deferReply({ephemeral: true});
    const guild = interaction.guild;
    const roleId = interaction.options.getRole("role-to-ping").id;
    const icon = interaction.options.getString("icon");
    const word = interaction.options.get("description").value;
    const time = interaction.options.getString("time-until-pings");

    // Check if the icon is a valid Unicode emoji
    const regex = /^[\p{Emoji_Presentation}\p{Emoji}\u3030\ufe0f]+$/u;
    if (!regex.test(icon)) {
      await interaction.editReply({ content: 'Please enter a valid icon. Don\'t use discord emojis.', ephemeral: true });
      return;
    }

    if (word.includes(' ')){
      await interaction.editReply({ content: "Please make sure you are using one word."});
      return;
    }
    else if (word.length > 15){
      await interaction.editReply({ content: "Please shorten the length of your word."});
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

    // Initialize pingableRoles as an empty object if it doesn't exist
    if (!data.pingableRoles){
      data.pingableRoles = {};
    }
    
    // Add the new role to pingableRoles
    if (time === "N/A"){
      data.pingableRoles[roleId] = { icon: icon, description: word };
    }
    else{
      data.pingableRoles[roleId] = { icon: icon, description: word, timeToPing: time };
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data));
    let reply = `Added <@&${roleId}> to your list of pingable roles using the icon ${icon}`
    if (time !== "N/A"){
      reply += `and will ping after ${time} EST`;
    }
    await interaction.editReply(reply);
  }
}