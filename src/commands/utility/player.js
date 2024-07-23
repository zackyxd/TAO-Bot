const API = require("../../API.js");
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("players")
    .setDescription("Show the accounts that a player has linked.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Which user would you like to see?").setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "players") {
      await interaction.deferReply();
      var user = interaction.options?.getMember("user"); // gets full user
      let guildId = interaction.guild.id
      const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guildId}.json`);
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(filePath));
      } catch (err) {
        console.error(err);
        return;
      }

      if (!data.playersId[user.id]) {
        const embed = new EmbedBuilder()
          //.setTitle("Error")
          .setDescription(`<@${user.id}> has not been linked to any accounts yet.`)
          .setColor('Red')
        await interaction.editReply({ embeds: [embed] });
        return null;
      }

      if (data.playersId[user.id]?.playertags?.length === undefined) {
        data.playersId[user.id] = { playertags: [] }; // if didnt have playertags array field
        const embed = new EmbedBuilder()
          //.setTitle("Error")
          .setDescription(`<@${user.id}> did not have any players linked.`)
          .setColor('Red')
        fs.writeFileSync(filePath, JSON.stringify(data))
        await interaction.editReply({ embeds: [embed] });
        return null;
      }

      console.log(data.playersId[user.id]?.playertags?.length);
      if (data.playersId[user.id]?.playertags?.length === 0) {
        const embed = new EmbedBuilder()
          //.setTitle("Error")
          .setDescription(`<@${user.id}> did not have any players linked.`)
          .setColor('Red')
        await interaction.editReply({ embeds: [embed] });
        return null;
      }

      //console.log("user exists");
      const emojiPath = path.join(__dirname, '..', '..', '..', `emojis.json`);
      let emojis = {}
      try {
        const data = fs.readFileSync(emojiPath, 'utf8');
        emojis = JSON.parse(data); // Parse the JSON string into an array
      } catch (err) {
        console.error('Error loading emojis:', err);
        return []; // Return an empty array in case of an error
      }


      description = "";
      let playertags = data.playersId[user.id].playertags;
      let accounts = [];

      // Fetch all player data first
      for (const tag of playertags) {
        let account = await playertag(tag);
        if (account) {
          accounts.push(account);
        }
      }

      // Sort accounts by expLevel in descending order
      accounts.sort((a, b) => b.expLevel - a.expLevel);

      console.log(accounts.length);
      if (accounts.length === 1) {
        let playerMessage = await playerStats(accounts[0]);
        if (playerMessage === null || playerMessage === undefined) {
          return;
        }
        await interaction.editReply({ embeds: [playerMessage.embedReturn] });
        return;
      }


      // Construct the description with sorted accounts
      accounts.forEach((account, index) => {
        let tag = account.tag.substring(1);
        description += `**${index + 1}**. [${account.name}](https://royaleapi.com/player/${tag}) <:experience${account.expLevel}:${findEmojiId(emojis, `experience${account.expLevel}`)}> \n\n`;
      });


      // let username = user.nickname || user.user.username;
      // const embedReturn = new EmbedBuilder()
      //   .setTitle(`${username} Accounts`)
      //   .setThumbnail(process.env.BOT_IMAGE)
      //   .setColor("Purple")
      //   .setDescription(description);


      if (description.length >= 1) {
        let username = user.nickname || user.user.username;
        const embedReturn = new EmbedBuilder()
          .setTitle(`${username} Accounts`)
          .setThumbnail(process.env.BOT_IMAGE)
          .setColor("Purple")
          .setDescription(description);
        await interaction.editReply({ embeds: [embedReturn] });
        return;
      }
      else {
        const embed = new EmbedBuilder()
          //.setTitle("Error")
          .setDescription(`Error showing accounts for <@${user.id}>`)
          .setColor('Red')
        await interaction.editReply({ embeds: [embed] });
        return null;
      }
    }
  }
};

async function playertag(playertag) {
  if (playertag.charAt(0) !== '#') playertag = '#' + playertag;
  const playerURL = `https://proxy.royaleapi.dev/v1/players/${encodeURIComponent(
    playertag
  )}`;
  const playerData = await API.fetchData(playerURL, "PlayerData", false);
  if (playerData === 404 || playerData === 503) {
    return null;
  }
  // let errorCode = API.checkStatus(null, playerData, playertag);
  // //console.log(errorCode);
  // if (!errorCode.status) {
  //   // return errorCode, if error code, interaction already replied
  //   return errorCode;
  // }

  // Embed stuff

  return playerData;
}

function findEmojiId(emojiJson, nameLookingFor) {
  let emojiId = emojiJson.find(emoji => {
    // Ensure both values are strings and trim any whitespace
    const emojiName = String(emoji.name).trim();
    const trimmedName = String(nameLookingFor).trim();

    return emojiName === trimmedName;
  })?.id;

  if (emojiId) {
    //console.log(`Found emoji ID: ${emojiId}`);
    return emojiId;
  } else {
    console.error(`Emoji not found for: ${nameLookingFor}`);
    return null;
  }
}

async function playerStats(account) {
  if (account === null) return null;
  const emojiPath = path.join(__dirname, '..', '..', '..', `emojis.json`);
  let emojis = {}
  try {
    const data = fs.readFileSync(emojiPath, 'utf8');
    emojis = JSON.parse(data); // Parse the JSON string into an array
  } catch (err) {
    console.error('Error loading emojis:', err);
    return []; // Return an empty array in case of an error
  }
  let name = account.name;
  let playertag = (account.tag).substring(1);
  let level = account.expLevel;
  let role = account?.role ?? '';
  let clan = account?.clan?.name ?? 'No Clan';
  let cw2Wins = 'N/A';
  let classicWins = 'N/A';
  let grandWins = 'N/A';

  let currentPOL;
  let currentPOLTrophies;
  let lastPOL;
  let lastPOLTrophies;
  let lastPOLRank;
  let bestPOL;
  let bestPOLTrophies;
  let bestPOLRank;

  let level15 = 0;
  let level14 = 0;
  let level13 = 0;
  let evolutions = 0;

  for (let card of account.cards) {
    let checkCardLevel = checkLevel(card.level, card.rarity);
    if (checkCardLevel === 15) {
      level15++;
    }
    if (checkCardLevel === 14) {
      level14++;
    }
    if (checkCardLevel === 13) {
      level13++;
    }
    if (card?.evolutionLevel === 1) {
      evolutions++;
    }
  }

  let badgeId = account?.clan?.badgeId ?? '0_';

  currentPOL = account?.currentPathOfLegendSeasonResult?.leagueNumber ?? 1;
  if (currentPOL === 10) {
    currentPOLTrophies = account.currentPathOfLegendSeasonResult.trophies;
  }

  lastPOL = account?.lastPathOfLegendSeasonResult?.leagueNumber ?? 1;
  if (lastPOL === 10) {
    lastPOLTrophies = account.lastPathOfLegendSeasonResult.trophies;
    lastPOLRank = account.lastPathOfLegendSeasonResult.rank;
  }

  bestPOL = account?.bestPathOfLegendSeasonResult?.leagueNumber ?? 1;
  if (bestPOL === 10) {
    bestPOLTrophies = account.bestPathOfLegendSeasonResult.trophies;
    bestPOLRank = account.bestPathOfLegendSeasonResult.rank;
  }

  if (account.role === 'leader') {
    role = '(Leader)';
  }
  else if (account.role === 'coLeader') {
    role = '(Co-Leader)'
  }
  else if (account.role === 'elder') {
    role = '(Elder)'
  }
  else if (account.role === 'member') {
    role = '(Member)';
  }

  for (let badge of account.badges) {
    if (badge.name === "Classic12Wins") {
      classicWins = badge.progress;
    }
    if (badge.name === "Grand12Wins") {
      grandWins = badge.progress;
    }
    if (badge.name === "ClanWarWins") {
      cw2Wins = badge.progress;
    }
  }


  let description = "";
  description += `<:${badgeId}:${findEmojiId(emojis, badgeId)}> ${clan} ${role}\n\n`
  description += `__**Path of Legends**__\n`;
  if (currentPOLTrophies !== undefined) {
    description += `Current: <:polMedal:1196602844166492261> ${currentPOLTrophies}\n`;
  }
  else {
    description += 'Current: <:polMedal:1196602844166492261> ---\n';
  }

  if (lastPOLTrophies !== undefined && lastPOLRank !== null) {
    description += `Last: <:polMedal:1196602844166492261> ${lastPOLTrophies} (#${lastPOLRank})\n`;
  }
  else if (lastPOLTrophies !== undefined && lastPOLRank === null) {
    description += `Last: <:polMedal:1196602844166492261> ${lastPOLTrophies}\n`;
  }

  if (bestPOLTrophies !== undefined && bestPOLRank !== null) {
    description += `Best: <:polMedal:1196602844166492261> ${bestPOLTrophies} (#${bestPOLRank})\n\n`;
  }
  else if (bestPOLTrophies !== undefined && bestPOLRank === null) {
    description += `Best: <:polMedal:1196602844166492261> ${bestPOLTrophies}\n\n`;
  }
  else {
    description += `Best: <:polMedal:1196602844166492261> ---\n\n`;
  }

  description += `__**Card Levels**__ <:cards:1196602848411127818>\n<:Evolutions:1248347132088418478>: ${evolutions}\n<:experience15:1196504104256671794>: ${level15}\n<:experience14:1196504101756874764>: ${level14}\n<:experience13:1196504100200796160>: ${level13}`;

  //const fileReturn = new AttachmentBuilder(`arenas/league${currentPOL}.png`);
  const playerLeagueIcon = getLink("league" + currentPOL + ".png");
  const embedReturn = new EmbedBuilder()
    .setTitle(`${name} <:experience${level}:${findEmojiId(emojis, `experience${level}`)}>\n`)
    .setThumbnail(playerLeagueIcon)
    .setURL(`https://royaleapi.com/player/${playertag}`)
    .setColor("Purple")
    .addFields(
      { name: `__CW2 Wins__ <:cw2:1196604288886124585>`, value: `${cw2Wins}`, inline: true },
      { name: `__CC Wins__ <:classicWin:1196602845890355290>`, value: `${classicWins}`, inline: true },
      { name: `__GC Wins__ <:grandChallenge:1196602855482728560>`, value: `${grandWins}`, inline: true }
    )
    .setDescription(description);

  //await interaction.editReply({ embeds: [embedReturn], files: [file] });
  return { embedReturn, name, playertag };
}


function checkLevel(level, rarity) {
  let actualLevel = 0;
  if (rarity === "common") {
    actualLevel = level;
    return actualLevel;
  }
  if (rarity === "rare") {
    actualLevel = level + 2;
    return actualLevel;
  }
  if (rarity === "epic") {
    actualLevel = level + 5;
    return actualLevel;
  }
  if (rarity === "legendary") {
    actualLevel = level + 8;
    return actualLevel;
  }
  if (rarity === "champion") {
    actualLevel = level + 10;
    return actualLevel;
  }
}

function getLink(key) {
  // Read the JSON file
  const data = fs.readFileSync('imageLinks.json');
  const imageLinks = JSON.parse(data);

  // Check if the key exists in the JSON object
  if (imageLinks.hasOwnProperty(key)) {
    return imageLinks[key]; // Return the link associated with the key
  } else {
    return 'Key not found'; // Key does not exist in the JSON object
  }
}


function findEmojiId(emojiJson, nameLookingFor) {
  let emojiId = emojiJson.find(emoji => {
    // Ensure both values are strings and trim any whitespace
    const emojiName = String(emoji.name).trim();
    const trimmedName = String(nameLookingFor).trim();

    return emojiName === trimmedName;
  })?.id;
  if (emojiId) {
    //console.log(`Found emoji ID: ${emojiId}`);
    return emojiId;
  } else {
    console.error(`Emoji not found for: ${nameLookingFor}`);
    return null;
  }
}