const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const API = require("../../API.js");
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("delete-ping-role")
  .setDescription("Delete a role that members can ping.")
  .addRoleOption(option =>
    option.setName("role-to-ping")
    .setDescription("Which role will be deleted from being pinged?")
    .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction){
    await interaction.deferReply({ephemeral: true});
    const guild = interaction.guild;
    const roleId = interaction.options.getRole("role-to-ping").id;

    const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guild.id}.json`);

    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
    }
    

    // Delete role from being checked
    if (data.pingableRoles.hasOwnProperty(roleId)){
      // get description to remove it from players
      let roleDescription = data.pingableRoles[roleId].description;

      // delete role from json
      delete data.pingableRoles[roleId];

      for (let playerId in data.playersId){
        if (data.playersId[playerId].hasOwnProperty(roleDescription)){
          delete data.playersId[playerId][roleDescription];
        }
      }
      fs.writeFileSync(filePath, JSON.stringify(data));
      await interaction.editReply(`<@&${roleId}> has been deleted from being checked for pings and removed from all players.`);
      return;
    }
    fs.writeFileSync(filePath, JSON.stringify(data));
    await interaction.editReply(`<@&${roleId}> was not being checked for pings.`);
  }
}
