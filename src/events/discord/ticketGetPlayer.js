const { Events, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const API = require("../../API.js");
const fs = require('fs');
const path = require('path');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    const guild = message.guild;
    const channel = await guild.channels.cache.get(message.channelId);
    // HAS ROLES
    if (message.member.roles.cache.size !== 1){
      return;
    }

    // NO ROLES = NEW TICKET
    else{
      let parsedMessage = (message.content).split(/\s+/);
      let foundAccount = false;
      var account;

      let promises = parsedMessage.map(async (msg) => {
        if (msg.length > 13){
          let regex = /https:\/\/royaleapi\.com\/player\/(\w+)/;
          let match = msg.match(regex);
          if (match === null || match[1] === undefined){
            return;
          }
          account = await playertag(match[1]);
          if (match && !foundAccount) {
            foundAccount = true;
            account = await playertag(match[1]);
            return true;
          }
        }
        else if (msg.length >= 3 && msg.length <= 12) {
          account = await playertag(msg);
          if (account && !foundAccount) {
            foundAccount = true;
            account = await playertag(msg);
            return true;
          }
        }
        return false;
      });
      await Promise.all(promises);
      if (!foundAccount) {
        return;
      }
      let playerMessage = await playerStats(account);
      if (playerMessage === null || playerMessage === undefined){
        return;
      }

      const confirm = new ButtonBuilder()
      .setCustomId(`confirm@_@${message.author.id}@_@${playerMessage.name}@_@#${playerMessage.playertag}`)
      .setLabel("Confirm Account")
      .setStyle(ButtonStyle.Primary);

      const cancel = new ButtonBuilder()
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder()
      .addComponents(cancel, confirm);

      currentMessage = await channel.send({ embeds: [playerMessage.embedReturn], components: [row] });
      await channel.send({ content: `Hey <@${message.author.id}>, Thank you for providing your playertag! One of our coleaders will be with you as soon as possible <:pepelove:1248346307823927399>`});
    }
  }
}



async function playertag(playertag) {
  if (playertag.charAt(0) !== '#') playertag = '#' + playertag;
  const playerURL = `https://proxy.royaleapi.dev/v1/players/${encodeURIComponent(
    playertag
  )}`;
  const playerData = await API.fetchData(playerURL, "PlayerData", false);
  if (playerData === 404 || playerData === 503){
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


async function playerStats(account){
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

  for (let card of account.cards){
    let checkCardLevel = checkLevel(card.level, card.rarity);
    if (checkCardLevel === 15){
      level15++;
    }
    if (checkCardLevel === 14){
      level14++;
    }
    if (checkCardLevel === 13){
      level13++;
    }
    if (card?.evolutionLevel === 1){
      evolutions++;
    }
  }

  let badgeId = account?.clan?.badgeId ?? '0_';

  currentPOL = account?.currentPathOfLegendSeasonResult?.leagueNumber ?? 1;
  if (currentPOL === 10){
    currentPOLTrophies = account.currentPathOfLegendSeasonResult.trophies;
  }

  lastPOL = account?.lastPathOfLegendSeasonResult?.leagueNumber ?? 1;
  if (lastPOL === 10){
    lastPOLTrophies = account.lastPathOfLegendSeasonResult.trophies;
    lastPOLRank = account.lastPathOfLegendSeasonResult.rank;
  }

  bestPOL = account?.bestPathOfLegendSeasonResult?.leagueNumber ?? 1;
  if (bestPOL === 10){
    bestPOLTrophies = account.bestPathOfLegendSeasonResult.trophies;
    bestPOLRank = account.bestPathOfLegendSeasonResult.rank;
  }

  if (account.role === 'leader'){
    role = '(Leader)';
  }
  else if (account.role === 'coLeader'){
    role = '(Co-Leader)'
  }
  else if (account.role === 'elder'){
    role = '(Elder)'
  }
  else if (account.role === 'member'){
    role = '(Member)';
  }

  for (let badge of account.badges){
    if (badge.name === "Classic12Wins"){
      classicWins = badge.progress;
    }
    if (badge.name === "Grand12Wins")
    {
      grandWins = badge.progress;
    }
    if (badge.name === "ClanWarWins"){
      cw2Wins = badge.progress;
    }
  }


  let description = "";
  description += `<:${badgeId}:${findEmojiId(emojis, badgeId)}> ${clan} ${role}\n\n`
  description += `__**Path of Legends**__\n`;
  if (currentPOLTrophies !== undefined){
    description += `Current: <:polMedal:1196602844166492261> ${currentPOLTrophies}\n`;
  }
  else {
    description += 'Current: <:polMedal:1196602844166492261> ---\n';
  }
  
  if (lastPOLTrophies !== undefined && lastPOLRank !== null){
    description += `Last: <:polMedal:1196602844166492261> ${lastPOLTrophies} (#${lastPOLRank})\n`;
  }
  else if (lastPOLTrophies !== undefined && lastPOLRank === null){
    description += `Last: <:polMedal:1196602844166492261> ${lastPOLTrophies}\n`;
  }

  if (bestPOLTrophies !== undefined && bestPOLRank !== null){
    description += `Best: <:polMedal:1196602844166492261> ${bestPOLTrophies} (#${bestPOLRank})\n\n`;
  }
  else if (bestPOLTrophies !== undefined && bestPOLRank === null){
    description += `Best: <:polMedal:1196602844166492261> ${bestPOLTrophies}\n\n`;
  }
  else{
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
      return {embedReturn, name, playertag};
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

function checkLevel(level, rarity){
  let actualLevel = 0;
  if (rarity === "common"){
    actualLevel = level;
    return actualLevel;
  }
  if (rarity === "rare"){
    actualLevel = level + 2;
    return actualLevel;
  }
  if (rarity === "epic"){
    actualLevel = level + 5;
    return actualLevel;
  }
  if (rarity === "legendary"){
    actualLevel = level + 8;
    return actualLevel;
  }
  if (rarity === "champion"){
    actualLevel = level + 10;
    return actualLevel;
  }
}