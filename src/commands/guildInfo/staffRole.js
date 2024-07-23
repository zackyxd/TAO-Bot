const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("set-staff-role")
  .setDescription("Set the role that all staff will have")
  .addRoleOption(option =>
    option.setName("role")
    .setDescription("Pick a role that staff have")
    .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  async execute(interaction){
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === "set-staff-role") {
      await interaction.deferReply({ephemeral: true});
      const guild = interaction.guild;
      const role = interaction.options.getRole("role");
      
      //console.log(role);

      const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guild.id}.json`);

      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(filePath));
      }
      catch (err){
        console.error(err);
        return;
      }

      data.staffRole = role.id;
      fs.writeFileSync(filePath, JSON.stringify(data));

      await interaction.editReply(`The staff role has been set to ${role}`);
    }
  }
}