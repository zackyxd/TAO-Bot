const API = require("../../API.js");
const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
//const Abbrev = require("../../models/02ClanAbbreviations.js");
//const User = require("../../models/02UserModel.js");
const Emoji = require('../../models/EmojiModel.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("link-player")
    .setDescription("Link a single player to a playertag")
    .addUserOption((option) =>
      option.setName("user").setDescription("@user to link").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("playertag")
        .setDescription("playertag of user")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
  
    async execute(interaction){
      await interaction.deferReply();
      var member = interaction.options.getMember("user"); // gets full user
      var playertag = interaction.options.get("playertag").value.toUpperCase();
      if (playertag.charAt(0) !== "#") {
        playertag = "#" + playertag;
      }

      let account = await getPlayertag(interaction, playertag);
      if (account === null) return;

      let playerMessage = await playerStats(account, interaction, member);
      if (playerMessage === null || playerMessage === undefined){
        return;
      }
      
      const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(filePath));
      }
      catch (err){
        console.error(err);
      }
      let oldUserId = data.playersTag[playertag] ? data.playersTag[playertag].userId : '';
      if (data.playersTag[playertag] && oldUserId !== member.id){
        const confirm = new ButtonBuilder()
          .setCustomId(`change@_@${member.user.id}@_@${playerMessage.name}@_@#${playerMessage.playertag}@_@${interaction.user.id}`)
          .setLabel("Change Link?")
          .setStyle(ButtonStyle.Primary);

        const cancel = new ButtonBuilder()
          .setCustomId('cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
          .addComponents(cancel, confirm);

        await interaction.editReply({ embeds: [playerMessage.embedReturnNoLink], files: [playerMessage.fileReturn], components: [row] });

        interaction.followUp({ content: `This playertag is already linked to <@${oldUserId}>, would you like to switch this to <@${member.id}>?`, ephemeral: true })
      }
      // Write new player
      else if (!data.playersTag[playertag]){

        data.playersTag[playertag] = { userId: member.user.id };

        if (data.playersId[member.user.id].playertags.includes(playertag)) {
          // if userId already exists, append playertag to existing array for multiple links
          data.playersId[member.user.id].playertags.push(playertag)
        } else {
          data.playersId[member.user.id] = { playertags: [playertag] };
        }
        try {
          await member.setNickname(account.name);
          await interaction.editReply({ embeds: [playerMessage.embedReturn], files: [playerMessage.fileReturn] });
          
        } catch (error) {
          await interaction.editReply({ embeds: [playerMessage.embedReturnNoLink], files: [playerMessage.fileReturn] });
          await interaction.followUp({ content: "Couldn't change their name, but link was still completed.", ephemeral: true })
        }
      }
      else{
        if (data.playersId[member.user.id]) {
          // if userId already exists, append playertag to existing array for multiple links
          if (!data.playersId[member.user.id].playertags.includes(playertag)) {
            data.playersId[member.user.id].playertags.push(playertag)
          }
        } 
        else {
          data.playersId[member.user.id] = { playertags: [playertag] };
        }
        await interaction.editReply({ embeds: [playerMessage.embedReturnNoLink], files: [playerMessage.fileReturn] });
        interaction.followUp({ content: `This playertag was already linked to <@${oldUserId}>.`, ephemeral: true })
      }

      fs.writeFileSync(filePath, JSON.stringify(data));
      

    }
}

async function getPlayertag(interaction, playertag) {
  if (playertag.charAt(0) !== '#') playertag = '#' + playertag;
  const playerURL = `https://proxy.royaleapi.dev/v1/players/${encodeURIComponent(
    playertag
  )}`;
  const playerData = await API.fetchData(playerURL, "PlayerData", true);
  if (playerData === 404){
    let filename = 0;
    //const attachment = new AttachmentBuilder(`badges/${filename}.png`);
    const embed = new EmbedBuilder()
    //.setTitle("Error")
    .setDescription(`Player \`${playertag}\` not found.`)
    .setColor('Red')
    //.setThumbnail(`attachment://${filename}.png`)
    interaction.editReply({ embeds: [embed] });
    return null;
  }
  if (playerData === 503){
    const embed = new EmbedBuilder()
    //.setTitle("Error")
    .setDescription(`Clash Royale is currently on maintainence break. Please try again later.`)
    .setColor('Red')
    interaction.editReply({ embeds: [embed] });
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

async function playerStats(account, interaction, member){
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

  let linker = interaction.member.nickname ?? interaction.user.username;
  let linkee = member.nickname ?? member.user.username;
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
      .setFooter({ text: `${account.name} linked by ${linker}!`, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(description);

      const embedReturnNoLink = new EmbedBuilder()
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
      return {embedReturn, embedReturnNoLink, fileReturn, name, playertag};
  
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