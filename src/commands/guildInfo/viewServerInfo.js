const API = require("../../API.js");
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const fs = require('fs');
const moment = require('moment-timezone');

module.exports = {

  data: new SlashCommandBuilder()
  .setName('server-info')
  .setDescription('View linked roles available by /link')
  .setDefaultMemberPermissions()
  .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),


  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
    if (interaction.commandName === 'server-info'){
      await interaction.deferReply();
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(filePath));
      }
      catch (err){
        console.error(err);
        return;
      }


      let clansArray = [];
      for (let clanName in data.clans){
        let clan = data.clans[clanName];
        if (clan.abbreviation){
          clansArray.push({ name: clanName, ...clan });
        }
      }
  
      // Sort clans by abbreviation
      clansArray.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
  
      let clans = "";
      let specificClans = "";
      clansArray.forEach(clan => {
        let name = false;
        clans += `* [${clan.name}](<https://royaleapi.com/clan/${(clan.clantag).substring(1)}>): **${clan.abbreviation}**\n`;

        if (clan.roleId && (clan.warDayChannel || clan.clanlogsChannel)){
          specificClans += `<@&${clan.roleId}>\n`;
          name = true;
        }
        else if (clan.warDayChannel || clan.clanlogsChannel){
          specificClans += `${clan.name}\n`;
          name = true;
        }


        if (name === true){
          if (clan.warDayChannel){
            specificClans += `* Posting war stats to <#${clan.warDayChannel}>\n`
          }
          if (clan.clanlogsChannel){
            specificClans += ` * Posting clan logs to <#${clan.clanlogsChannel}>\n`
          }
          specificClans += '\n';
        }
        
      });

      let abbreviations = "";
      if (clans === ""){
        abbreviations = "**No clans with abbreviations for this server.**\n"
      }
      else{
        abbreviations = "__**Clan Abbreviations**__\n" + clans;
      }

      let specificInfo = "";
      if (specificClans === ""){
        specificInfo = "**No clans with specific information for this server.**\n\n"
      }
      else{
        specificInfo = `\n__**Clan Info**__\n${specificClans}`
      }


      let rolePings = "";
      for (let roleId in data.pingableRoles){
        let role = data.pingableRoles[roleId];
        rolePings += `<@&${roleId}>: ${role.icon}\n`
        if (role.timeToPing){
          let timeToPing = role.timeToPing;
          let timeZone = 'America/New_York'; // The timezone of the original time
          let momentTime = moment.tz(timeToPing, "HH:mm", timeZone);
          let unixTimestamp = momentTime.unix();
          rolePings += `**Pings after: ${role.timeToPing} EST** (<t:${unixTimestamp}:t>)\n\n`
        }
        else{
          rolePings += '\n';
        }
      }

      if (rolePings === ""){
        rolePings = "**No roles set to be pinged by players**\n";
      }



      let links = "";
      if (data.linkChannel){
        links = `**Posting clan invite links to <#${data.linkChannel}>**\n`
      }
      else{
        links = `**No link channel set up, use** \`/set-link-channel\`\n`
      }

      let staff = "";
      if(data.staffRole){
        staff = `**The staff role is <@&${data.staffRole}>**`
      }
      else{
        staff = `**No staff role set up, use** \`/set-staff-role\`\n`
      }

      let playerCount = Object.keys(data.playersTag).length;
      let players = `\n**There are ${playerCount} players linked in the server!**`;

      const embed = new EmbedBuilder()
      .setTitle(interaction.guild.name + " Info")
      .setThumbnail(process.env.BOT_IMAGE)
      .setDescription(abbreviations + specificInfo + rolePings + links + staff + players)
      .setColor('Purple');

      await interaction.editReply({ embeds: [embed] });
    }
  }
}