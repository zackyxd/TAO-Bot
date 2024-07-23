const API = require("../../API.js");
const path = require('path');
const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pings')
    .setDescription("Show users who pinged set roles in your server"),


  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "pings") {
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

      for (let userId in data.playersId) {
        let player = data.playersId[userId];
        for (let property in player) {
          for (let roleId in data.pingableRoles) {
            if (data.pingableRoles[roleId].description === property && player[property] !== undefined) {
              // Check if playertags is an array before iterating
              if (Array.isArray(player.playertags)) {
                for (let tag of player.playertags) {
                  let playerData = playerCache[tag];
                  if (!playerData) {
                    playerData = await getPlayer(tag, interaction);
                    if (playerData === null) {
                      return;
                    }
                    playerCache[tag] = playerData; // Add the player data to the cache
                  }
                  if (!playersPinged.hasOwnProperty(tag)) {
                    playersPinged[tag] = { name: playerData.name, tag: tag, clan: playerData.clan ? playerData.clan.name : 'Not in a clan', roles: [] };
                  }
                  playersPinged[tag].roles.push(roleId);
                }
              } else {
                console.log(player);
                console.error(`Expected an array for playertags, got:`, player.playertags);
              }
            }
          }
        }
      }

      // Define roleNames by mapping role IDs to their descriptions
      let roleNames = {};
      for (let roleId in data.pingableRoles) {
        roleNames[roleId] = data.pingableRoles[roleId].description;
      }

      let roleClanPlayers = {};

      // Initialize roleClanPlayers with roleIds and clan names
      for (let roleId in data.pingableRoles) {
        roleClanPlayers[roleId] = {};
        for (let clanName in data.clans) {
          roleClanPlayers[roleId][clanName] = [];
        }
      }

      // Populate roleClanPlayers with players
      for (let tag in playersPinged) {
        let player = playersPinged[tag];
        for (let role of player.roles) {
          let clanName = player.clan || 'Not in a clan';
          // Ensure the role and clanName are initialized in roleClanPlayers
          if (!roleClanPlayers[role]) {
            roleClanPlayers[role] = {};
          }
          if (!roleClanPlayers[role][clanName]) {
            roleClanPlayers[role][clanName] = [];
          }
          roleClanPlayers[role][clanName].push(player);
        }
      }

      for (let roleId in roleClanPlayers) {
        let totalPlayers = 0;
        // Calculate the total number of players for the roleId across all clans
        for (let clanName in roleClanPlayers[roleId]) {
          totalPlayers += roleClanPlayers[roleId][clanName].length;
        }

        // Only proceed if there are players who have pinged the role
        if (totalPlayers > 0) {
          reply += `<@&${roleId}>\n`; // Use the roleId directly
          for (let clanName in roleClanPlayers[roleId]) {
            if (roleClanPlayers[roleId][clanName].length > 0) {
              reply += `__**${clanName}**__\n`;
              let sortedPlayers = roleClanPlayers[roleId][clanName].sort((a, b) => a.name.localeCompare(b.name)); // Sort players by name within the clan
              for (let player of sortedPlayers) {
                let playertag = player.tag.substring(1);
                reply += `[${player.name}](<https://royaleapi.com/player/${playertag}>)\n`;
              }
              reply += '\n';
            }
          }
        }
      }


      if (reply === '') {
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

  if (playerData === 404) {
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
  if (playerData === 503) {
    const embed = new EmbedBuilder()
      //.setTitle("Error")
      .setDescription(`Clash Royale is currently on maintainence break. Please try again later.`)
      .setColor('Red')
    await interaction.editReply({ embeds: [embed] });
    return null;
  }
  return playerData;
}