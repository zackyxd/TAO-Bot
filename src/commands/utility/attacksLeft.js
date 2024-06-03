const API = require("../../API.js");
const path = require('path');
const fs = require('fs');
const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');

//module.exports = {

  // data: new SlashCommandBuilder()
  // .setName('attacks')
  // .setDescription('Shows players with attacks left')
  // .addStringOption(option => 
  //   option.setName('clantag')
  //     .setDescription('clantag')
  //     .setRequired(true)
  // ),
  

async function attacksLeft(abbrev, guildId){
  let result = await getAttacks(abbrev, guildId);
  if (result === null){
    const embedReturn = new EmbedBuilder()
    //.setTitle("Error")
    .setDescription(`Clash Royale could not provide the data for missing attacks at this time.`)
    .setColor('Red')
    result = embedReturn;
    return { embedReturn };
  }

  const emojiPath = path.join(__dirname, '..', '..', '..', `emojis.json`);
  let emojis = {}
  try {
    const data = fs.readFileSync(emojiPath, 'utf8');
    emojis = JSON.parse(data); // Parse the JSON string into an array
  } catch (err) {
    console.error('Error loading emojis:', err);
    return []; // Return an empty array in case of an error
  }


  // { clanName, clantag, playerAttacksLeft, outOfClan, badgeId, pointsToday, whichDayType, decksRemaining, warWeek, warDay };
  let { clanName, clantag, playerAttacksLeft, outOfClan, badgeId, pointsToday, whichDayType, decksRemaining, warWeek, warDay, playersRemaining } = result;
  
  if (whichDayType === 'training'){
    whichDayType = 'Training';
  }
  else if (whichDayType === 'colosseum'){
    whichDayType = 'Colosseum';
  }
  else if (whichDayType === 'warDay')
  {
    whichDayType = `War Week ${warWeek}`
  }
  // Create a string that represents the table
  let reply = '';
  for (let attacksLeft = 4; attacksLeft >= 1; attacksLeft--) {
    if (playerAttacksLeft.hasOwnProperty(attacksLeft)) {
      let players = [];
      for (let player of playerAttacksLeft[attacksLeft]) {
        players.push(`* ${player.name}`); // show player with attacks
      }
  
      if (players.length > 0) {
        if (attacksLeft === 1){
          reply += `__**${attacksLeft} Attack**__\n` + players.join('\n') + '\n\n';
        }
        else{
          reply += `__**${attacksLeft} Attacks**__\n` + players.join('\n') + '\n\n';
        }
      }
    }
  }

  //table += `──────────\n<:fame:1191543365867684003> ${pointsToday.toLocaleString()}\n<:decksLeft:1187752640508088370> ${decksRemaining}\n<:peopleLeft:1188128630270861492> ${playersRemaining}`
  reply += `<:decksLeft:1187752640508088370> ${decksRemaining}\n<:peopleLeft:1188128630270861492> ${playersRemaining}`

  if (outOfClan){
    const embedReturn = new EmbedBuilder()
    .setTitle("__" + clanName + "__")
    .setURL(`https://royaleapi.com/clan/${clantag.substring(1)}/war/race`)
    .setAuthor({ name: `${whichDayType} | Day ${warDay}` })
    .setDescription(reply)
    .setColor('Purple')
    .setFooter({ text: `* is out of clan` })
    .setThumbnail(process.env.BOT_IMAGE)
    //.setTimestamp();
    return { embedReturn };
  }
  else{
    const embedReturn = new EmbedBuilder()
    .setTitle("__" + clanName + "__")
    .setURL(`https://royaleapi.com/clan/${clantag.substring(1)}/war/race`)
    .setAuthor({ name: `${whichDayType} | Day ${warDay}` })
    .setDescription(reply)
    .setColor('Purple')
    .setThumbnail(process.env.BOT_IMAGE)
    //.setTimestamp();
    return { embedReturn };
  }
  // interaction.reply({ embeds: [embed], files: [attachment] });
}


async function getAttacks(abbrev, guildId){
  const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guildId}.json`);

  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(filePath));
  }
  catch (err){
    console.error(err);
  }
  fs.writeFileSync(filePath, JSON.stringify(data));

  let clantag;
  let clanName;

  for (let checkClanName in data.clans){
    let abbreviationCheck = data.clans[checkClanName].abbreviation;
    if (abbreviationCheck === abbrev){
      clanName = checkClanName;
      break;
    }
  }
  clantag = data.clans[clanName].clantag;

  const raceURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}/currentriverrace`;
  const clanURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}`;

  let raceData = await API.fetchData(raceURL, "RaceData", true);
  let clanData = await API.fetchData(clanURL, "ClanData", true);
  if (raceData === 503 || clanData === 503 || raceData === 404 || clanData === 404){
    return null;
  }

  let membersInClan = {}; // If player in clan
  let membersNotClan = {}; // If player left clan but has attacks left
  // data.playersTag[playertag] = { userId: member.user.id };

  for (let i = 0; i < clanData.memberList.length; i++){
    let member = clanData.memberList[i];
    membersInClan[member.tag] = { name: member.name, role: member.role };
  }
  //console.log(Object.keys(membersInClan).length);

  for (let i = 0; i < raceData.clan.participants.length; i++){
    let participant = raceData.clan.participants[i];
    if (!membersInClan[participant.tag]){
      membersNotClan[participant.tag] = { name: participant.name, role: undefined };
    }
  }

  let playerAttacksLeft = { 1: [], 2: [], 3: [], 4: [] };
  let totalDecksUsed = 0;
  let playersRemaining = 50;
  for (let i = 0; i < raceData.clan.participants.length; i++){
    let participant = raceData.clan.participants[i];
    if (!membersInClan[participant.tag] && !membersNotClan[participant.tag]){
      continue;
    }
    let attacksLeft = 4 - participant.decksUsedToday; // Shows how many attacks left over
    totalDecksUsed += participant.decksUsedToday;
    // Ensure attacksLeft is within the expected range
    if (participant.decksUsedToday >= 1){
      playersRemaining -= 1;
    }
    if (attacksLeft > 0 && attacksLeft <= 4) {
      // Add to playerAttacksLeft
      if (membersNotClan[participant.tag] && participant.decksUsedToday >= 1){
        playerAttacksLeft[attacksLeft].push({ name: participant.name, tag: participant.tag, outOfClan: true })
      }
      else if (membersInClan[participant.tag]){
        playerAttacksLeft[attacksLeft].push({ name: participant.name, tag: participant.tag, outOfClan: false })
      }
    }
  }

  for (let attacksLeft in playerAttacksLeft){
    playerAttacksLeft[attacksLeft] = sortList(playerAttacksLeft[attacksLeft]);
  }

  let outOfClan = false;
  for (let attacksLeft in playerAttacksLeft){
    for (let player of playerAttacksLeft[attacksLeft]) {
      if (player.outOfClan === true){
        player.name = player.name + " *";
        outOfClan = true;
      }
    }
  }

  // embed stuff
  let badgeId = String(clanData.badgeId); // badgeId
  let pointsToday = raceData.clan.fame; // total points earned today
  let whichDayType = raceData.periodType;
  let decksRemaining = 200 - totalDecksUsed;
  let warWeek = raceData.sectionIndex + 1;
  if (whichDayType === 'training'){
    var warDay = (raceData.periodIndex % 7) + 1;
  }
  else{
    var warDay = (raceData.periodIndex % 7) - 2;
  }
  return { clanName, clantag, playerAttacksLeft, outOfClan, badgeId, pointsToday, whichDayType, decksRemaining, warWeek, warDay, playersRemaining };
}

function sortList(list){
  return sortedList = list.sort((a, b) => {
    // Remove special characters and convert to lowercase
    var nameA = a.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    var nameB = b.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
    // Compare the "cleaned" names
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

// (async () => {
//   try {
//     const result = await attacksLeft('a1');
//     console.log(result);
//   } catch (err) {
//     console.error(err);
//   }
// })();

module.exports.attacksLeft = attacksLeft;