const { Events, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const API = require("../../API.js");
const Emoji = require('../../models/EmojiModel.js');

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

      // const cancel = new ButtonBuilder()
      // .setCustomId('cancel')
      // .setLabel("Cancel")
      // .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder()
      .addComponents(confirm);

      currentMessage = await channel.send({ embeds: [playerMessage.embedReturn], files: [playerMessage.fileReturn], components: [row] });

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
  let level12 = 0;

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
    if (checkCardLevel === 12){
      level12++;
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

  let findEmoji = await Emoji.findOne({ emojiName: badgeId });

  let expEmoji = await Emoji.findOne({ emojiName: `experience${level}` });

  let description = "";
  description += `<:${badgeId}:${findEmoji.emojiId}> ${clan} ${role}\n\n`
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

  description += `__**Card Levels**__ <:cards:1196602848411127818>\n<:experience15:1196504104256671794>: ${level15}\n<:experience14:1196504101756874764>: ${level14}\n<:experience13:1196504100200796160>: ${level13}\n<:experience12:1196504097449312336>: ${level12}`;

  const fileReturn = new AttachmentBuilder(`arenas/league${currentPOL}.png`);
      const embedReturn = new EmbedBuilder()
      .setTitle(`${name} <:${expEmoji.emojiName}:${expEmoji.emojiId}>\n`)
      .setThumbnail(`attachment://league${currentPOL}.png`)
      .setURL(`https://royaleapi.com/player/${playertag}`)
      .setColor("Purple")
      .addFields(
        { name: `__CW2 Wins__ <:cw2:1196604288886124585>`, value: `${cw2Wins}`, inline: true },
        { name: `__CC Wins__ <:classicWin:1196602845890355290>`, value: `${classicWins}`, inline: true },
        { name: `__GC Wins__ <:grandChallenge:1196602855482728560>`, value: `${grandWins}`, inline: true }
      )
      .setDescription(description);
      
      //interaction.editReply({ embeds: [embedReturn], files: [file] });
      return {embedReturn, fileReturn, name, playertag};
  
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