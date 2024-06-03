const API = require("../../API.js");
const path = require('path');
const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
  .setName('pings')
  .setDescription("Show users who pinged set roles in your server"),
  

  async execute(interaction){
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "pings"){
      await interaction.deferReply();
      const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
      let data = {}
      try {
        data = JSON.parse(fs.readFileSync(filePath))
      } catch (err) {
        console.error(err)
      }
      fs.writeFileSync(filePath, JSON.stringify(data));

      let reply = '';
      let playersPinged = {};
      let playerCache = {}; // store tags to stop duplicate api checks

      for (let userId in data.playersId){
        let player = data.playersId[userId];
        for (let property in player) {
          for (let roleId in data.pingableRoles){
            if (data.pingableRoles[roleId].description === property && player[property] !== undefined){
              for (let tag of player.playertags){
                let playerData = playerCache[tag];
                if (!playerData) {
                  playerData = await getPlayer(tag, interaction);
                  if (playerData === null){
                    return;
                  }
                  playerCache[tag] = playerData; // Add the player data to the cache
                }
                if (!playersPinged.hasOwnProperty(tag)) {
                  playersPinged[tag] = {name: playerData.name, tag: tag, clan: playerData.clan ? playerData.clan.name : 'Not in a clan', roles: [] };
                }
                playersPinged[tag].roles.push(roleId);
              }
            }
          }
        }
      }
      

      let roleGroups = {};
      for (let tag in playersPinged){
        let player = playersPinged[tag];
        for (let role of player.roles) {
          if (!roleGroups.hasOwnProperty(role)){
            roleGroups[role] = { players: [] };
          }
          roleGroups[role].players.push({ name: player.name, tag: player.tag, clan: player.clan });
        }
      }
      
      // Create a map of role IDs to names
      let roleNames = {};
      for (let roleId in data.pingableRoles) {
        roleNames[roleId] = data.pingableRoles[roleId].description;
      }

      // Sort the roles by name
      let sortedRoles = Object.keys(roleGroups).sort((a, b) => {
        let nameA = roleNames[a];
        let nameB = roleNames[b];

        return nameA.localeCompare(nameB); // Sort alphabetically
      });
      
      //console.log(roleGroups);
      for (let i in sortedRoles) {
        let role = sortedRoles[i];
        //console.log(role);
        reply += `<@&${role}>\n`;
      
        // sort players by clan name, then by name
        let sortedPlayers = roleGroups[role].players.sort((a, b) => {
          if (a.clan === 'Not in a clan') return 1;
          if (b.clan === 'Not in a clan') return -1;
          let clanCompare = a.clan.localeCompare(b.clan);
          return clanCompare !== 0 ? clanCompare : a.name.localeCompare(b.name);
        });
      
        for (let player of sortedPlayers) {
          let playertag = (player.tag).substring(1);
          reply += `__**${player.clan}**__\n`;
          reply += `[${player.name}](<https://royaleapi.com/player/${playertag}>)\n`;
        }
        reply += '\n';
      }
      if (reply === ''){
        const embed = new EmbedBuilder()
        .setColor('Purple')
        // late
        .setDescription("No one has pinged any roles yet.")
        interaction.editReply({ embeds: [embed] });
        return;
      }
      let iconUrl = interaction.guild.iconURL({ dynamic: true, size: 2048 });
      const embed = new EmbedBuilder()
      .setColor('Purple')
      // late
      .setDescription(reply)
      .setThumbnail(iconUrl);
      interaction.editReply({ embeds: [embed] });
      return;
      
      
    }
  }
}


async function getPlayer(playertag, interaction) {
  const playerURL = `https://proxy.royaleapi.dev/v1/players/${encodeURIComponent(
    playertag
  )}`;
  const playerData = await API.fetchData(playerURL, "PlayerData", true);

  if (playerData === 404){
    let filename = 0;
    const attachment = new AttachmentBuilder(`badges/${filename}.png`);
    const embed = new EmbedBuilder()
    .setTitle("Error")
    .setDescription(`Player not found. Let Zacky know this message happened!`)
    .setColor('Red')
    .setThumbnail(`attachment://${filename}.png`)
    await interaction.editReply({ embeds: [embed], files: [attachment] });
    return null;
  }
  if (playerData === 503){
    const embed = new EmbedBuilder()
    //.setTitle("Error")
    .setDescription(`Clash Royale is currently on maintainence break. Please try again later.`)
    .setColor('Red')
    await interaction.editReply({ embeds: [embed] });
    return null;
  }
  return playerData;
}