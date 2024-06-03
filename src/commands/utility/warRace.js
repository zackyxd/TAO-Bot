const API = require("../../API.js");
const path = require('path');
const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');

async function checkRace(abbrev, guildId){

  const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guildId}.json`);

  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(filePath));
  }
  catch (err){
    console.error(err);
  }
  fs.writeFileSync(filePath, JSON.stringify(data));
  const emojiPath = path.join(__dirname, '..', '..', '..', `emojis.json`);
  let emojis = {}
  try {
    const data = fs.readFileSync(emojiPath, 'utf8');
    emojis = JSON.parse(data); // Parse the JSON string into an array
  } catch (err) {
    console.error('Error loading emojis:', err);
    return []; // Return an empty array in case of an error
  }
  //fs.writeFileSync(emojiPath, JSON.stringify(emojis));
  //console.log(emojis);
  

  let clantag;
  let clanName;

  for (let checkClanName in data.clans){
    let abbreviationCheck = data.clans[checkClanName].abbreviation;
    if (abbreviationCheck === abbrev){
      clanName = checkClanName;
      break;
    }
  }


  clantag = data.clans[clanName]?.clantag ?? null;
  if (!clantag){
    return;
  }

  const raceURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}/currentriverrace`;
  const clanURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}`;

  let raceData = await API.fetchData(raceURL, "RaceData", true);
  let clanData = await API.fetchData(clanURL, "ClanData", true);
  if (raceData === 503 || clanData === 503 || raceData === 404 || clanData === 404){
    const embedReturn = new EmbedBuilder()
    //.setTitle("Error")
    .setDescription(`Clash Royale could not provide the data for the race at this time.`)
    .setColor('Red')
    result = embedReturn;
    return { embedReturn };
  }
  let whichDay = raceData.periodType;
  let warDay = 0;
  let whichDayString = '';
  // let membersInClan = {}; // If player in clan
  // let membersNotClan = {}; // If player left clan but has attacks left
  
  // for (let i = 0; i < clanData.memberList.length; i++){
  //   let member = clanData.memberList[i];
  //   membersInClan[member.tag] = { name: member.name, role: member.role };
  // }

  // for (let i = 0; i < raceData.clan.participants.length; i++){
  //   let participant = raceData.clan.participants[i];
  //   if (!membersInClan[participant.tag]){
  //     membersNotClan[participant.tag] = { name: participant.name, role: undefined };
  //   }
  // }
  let clans = {};
  let warWeek = raceData.sectionIndex + 1;
  if (whichDay === 'training'){
    warDay = (raceData.periodIndex % 7) + 1;
  }
  else{
    warDay = (raceData.periodIndex % 7) - 2;
  }

  for (let i = 0; i < raceData.clans.length; i++){
    let totalDecksUsed = 0;
    let totalDecksLeft = 200;
    let playersRemaining = 50;
    let availablePoints = 0;
    let totalPossiblePoints = 0;
    let average = 0;
    let projectedPoints = 0;
    let fameToday = 0;
    let clan = raceData.clans[i]; // Get the current clan
    for (let j = 0; j < clan.participants.length; j++){
      let participant = clan.participants[j];
      //let attacksLeft = 4 - participant.decksUsedToday; // Shows how many attacks left over
      totalDecksUsed += participant.decksUsedToday;
      totalDecksLeft -= participant.decksUsedToday;
      if (participant.decksUsedToday === 1){
        availablePoints += 700;
      }
      else if (participant.decksUsedToday === 2){
        availablePoints += 400;
      }
      else if (participant.decksUsedToday === 3){
        availablePoints += 200;
      }
      // Ensure attacksLeft is within the expected range
      if (participant.decksUsedToday >= 1){
        playersRemaining -= 1;
      }
      // if (attacksLeft > 0 && attacksLeft <= 4) {
      //   // Add to playerAttacksLeft
      //   if (membersNotClan[participant.tag] && participant.decksUsedToday >= 1){
      //     playerAttacksLeft[attacksLeft].push({ name: participant.name, tag: participant.tag, outOfClan: true })
      //   }
      //   else if (membersInClan[participant.tag]){
      //     playerAttacksLeft[attacksLeft].push({ name: participant.name, tag: participant.tag, outOfClan: false })
      //   }
      // }
    }
    if (whichDay === 'warDay'){
      totalPossiblePoints = raceData.clans[i].periodPoints + availablePoints + (playersRemaining * 900);
      average = round(raceData.clans[i].periodPoints / totalDecksUsed, 2); // assuming you want to round to 2 decimal places
      projectedPoints = raceData.clans[i].periodPoints + Math.round((average*(totalDecksLeft)) / 50) * 50;
      fameToday = raceData.clans[i].periodPoints;
    }
    else if (whichDay === 'colosseum'){
      if (warDay !== 1){
        for (let i = 1; i < warDay; i += 1){
          totalDecksUsed += 200;
        }
      }
      totalPossiblePoints = raceData.clans[i].fame + availablePoints + (playersRemaining * 900);
      average = round(raceData.clans[i].fame / totalDecksUsed, 2); // assuming you want to round to 2 decimal places
      projectedPoints = raceData.clans[i].fame + Math.round((average*totalDecksLeft) / 50) * 50;
      fameToday = raceData.clans[i].fame;
    }
    if (isNaN(projectedPoints) || projectedPoints === undefined){
      projectedPoints = 0;
    }
    if (isNaN(average) || average === undefined){
      average = 0;
    }
    clans[raceData.clans[i].tag] = {
      name: raceData.clans[i].name,
      tag: raceData.clans[i].tag,
      fameToday: fameToday,
      projectedPoints: projectedPoints,
      totalPossiblePoints: totalPossiblePoints, 
      //minimumPossiblePoints: minimumPossiblePoints,
      attacksLeft: totalDecksLeft,
      average: average,
      badgeId: raceData.clans[i].badgeId,
    }
  }


  let description = '';

  if (whichDay === 'warDay'){
    whichDay = "__River Race__";
    whichDayString = `War Week ${warWeek}`

    let clansArray = Object.keys(clans).map(function(key) {
      return clans[key];
    });
    clansArray.sort(function(a, b) {
      if (a.boatPoints > 10000 && b.boatPoints <= 10000) {
        return -1; // a comes first
      } else if (b.boatPoints > 10000 && a.boatPoints <= 10000) {
        return 1; // b comes first
      } else {
        return b.fameToday - a.fameToday; // sort by fameToday if both are over 10000 or both are under 10000
      }
    });
  
    let clansArrayCopy = [...clansArray];
    clansArrayCopy.sort(function(a, b) {
        return b.projectedPoints - a.projectedPoints; // sort by fameToday if both are over 10000 or both are under 10000
    });

    for (let i = 0; i < clansArray.length; i++) {
      let badgeId = clansArray[i].badgeId;
      let escapedName = escapeMarkdown(clansArray[i].name);
      if (clantag === clansArray[i].tag){
        if (clansArray[i].boatPoints >= 10000){
          description += `__**${i+1}. ${escapedName}<:${clansArray[i].badgeId}:${findEmojiId(emojis, badgeId)}>**__`;
          description += `✅\n\n`
          continue;
        }
        description += `__**${i+1}. ${escapedName}<:${clansArray[i].badgeId}:${findEmojiId(emojis, badgeId)}>**__`;
        description += `<:fame:1191543365867684003> ${clansArray[i].fameToday.toLocaleString()}\n`;
        description += `<:ProjectedPoints:1187754001312272526> ${clansArray[i].projectedPoints.toLocaleString()}\n`;
        description += `<:decksLeft:1187752640508088370> ${clansArray[i].attacksLeft}\n`;
        description += `**<:average:1187754016780849253> ${clansArray[i].average}**\n\n`;
      }
      else{
        if (clansArray[i].boatPoints >= 10000){
          description += `**${i+1}. ${escapedName}<:${clansArray[i].badgeId}:${findEmojiId(emojis, badgeId)}>**`;
          description += `✅\n\n`
  
          continue;
        }
        description += `**${i+1}. ${escapedName}<:${clansArray[i].badgeId}:${findEmojiId(emojis, badgeId)}>**`;
        description += `<:fame:1191543365867684003> ${clansArray[i].fameToday.toLocaleString()}\n`;
        description += `<:ProjectedPoints:1187754001312272526> ${clansArray[i].projectedPoints.toLocaleString()}\n`;
        description += `<:decksLeft:1187752640508088370> ${clansArray[i].attacksLeft}\n`;
        description += `**<:average:1187754016780849253> ${clansArray[i].average}**\n\n`;
      }
    }
    let tag = clantag.replace(/#/g, "");
    //const fileReturn = new AttachmentBuilder(`AWSProfilePicNoBG.png`);
    const embedReturn = new EmbedBuilder()
    //.setTitle(whichDay)
    //.setURL(`https://royaleapi.com/clan/${tag}/war/race`)
    .setDescription(description)
    .setColor('Purple')
    .setAuthor({ name: `${whichDayString} | Day ${warDay}`, url: `https://royaleapi.com/clan/${tag}/war/race` })
    .setThumbnail(process.env.BOT_IMAGE)
    return { embedReturn };
  }

  else if (whichDay === 'colosseum'){
    let clansArray = Object.keys(clans).map(function(key) {
      return clans[key];
    });
    
    clansArray.sort(function(a, b) {
      return b.fameToday - a.fameToday;
    })
    whichDay = "__Colosseum__";
    whichDayString = 'Colosseum';
    for (let i = 0; i < clansArray.length; i++) {
      let badgeId = clansArray[i].badgeId;
      let escapedName = escapeMarkdown(clansArray[i].name);
      if (clantag === clansArray[i].tag){
        description += `__**${i+1}. ${escapedName}<:${clansArray[i].badgeId}:${findEmojiId(emojis, badgeId)}>**__`;
      }
      else{
        description += `**${i+1}. ${escapedName}<:${clansArray[i].badgeId}:${findEmojiId(emojis, badgeId)}>**`;
      }
      description += `<:fame:1191543365867684003> ${clansArray[i].fameToday.toLocaleString()}\n`;
      description += `<:ProjectedPoints:1187754001312272526> ${clansArray[i].projectedPoints.toLocaleString()}\n`;
      //description += `<:TotalPossiblePoints:1189927143954731089> ${clansArray[i].totalPossiblePoints.toLocaleString()}\n`;
      //description += `<:minimumScore:1202983565600620635> ${clansArray[i].minimumPossiblePoints.toLocaleString()}\n`;
      description += `<:decksLeft:1187752640508088370> ${clansArray[i].attacksLeft}\n`;
      description += `**<:average:1187754016780849253> ${clansArray[i].average}**\n\n`;
    }
    let tag = clantag.replace(/#/g, "");
    const embedReturn = new EmbedBuilder()
    //.setTitle(whichDay)
    .setThumbnail(process.env.BOT_IMAGE)
    //.setURL(`https://royaleapi.com/clan/${tag}/war/race`)
    .setDescription(description)
    .setColor('Purple')
    .setAuthor({ name: `${whichDayString} | Day ${warDay}`, url: `https://royaleapi.com/clan/${tag}/war/race` })
    return { embedReturn };
  }
}


function round(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals);
}

function escapeMarkdown(text) {
  let markdownCharacters = ['*', '_', '`', '~'];
  let escapedText = text.split('').map(function(character) {
    if (markdownCharacters.includes(character)) {
      return '\\' + character;
    }
    return character;
  }).join('');
  return escapedText;
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

// (async () => {
//   try {
//     const result = await checkRace('afh', '1182482429299138671');
//     //console.log(result);
//   } catch (err) {
//     console.error(err);
//   }
// })();

module.exports.checkRace = checkRace;