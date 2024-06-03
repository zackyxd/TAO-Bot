const API = require ("../../API.js");
const Emoji = require(`../../models/EmojiModel.js`);
const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

module.exports = {

  data: new SlashCommandBuilder()
  .setName("nudge")
  .setDescription("Nudge a clan using their abbreviation")
  .addStringOption(option =>
    option.setName("abbreviation")
    .setDescription("What is the abbreviation used for the clan?")
    .setRequired(true)
  )
  .addBooleanOption(option =>
    option.setName("all")
    .setDescription("Nudge everyone in this clan")
    .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),

  async execute(interaction){
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "nudge"){
      await interaction.deferReply({ephemeral : true});
      let abbreviation = interaction.options.get('abbreviation').value.toLowerCase();
      let result = await attackMessage(abbreviation, interaction);
      if (result === null){
        return;
      }
      await interaction.channel.send(result);
      await interaction.editReply("Nudge Sent");
    }
  }
}

async function attackMessage(abbreviation, interaction){

  let getAttacks = await getAttacksLeft(abbreviation, interaction);
  if (getAttacks === null){
    return null;
  }
  let all = interaction.options?.getBoolean('all') ?? false;

  let { clanName, clantag, playerAttacksLeft, outOfClan } = getAttacks;

  const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
  let data = {}
  try {
    data = JSON.parse(fs.readFileSync(filePath))
  } catch (err) {
    console.error(err)
  }
  fs.writeFileSync(filePath, JSON.stringify(data));
  

  let pingableRoles = {};
  for (let roleId in data.pingableRoles){
    let name = data.pingableRoles[roleId].description;
    pingableRoles[roleId] = {roleId: name, time: data.pingableRoles[roleId].timeToPing };
  }
  //console.log(pingableRoles);
  let currentTime = moment().tz("America/New_York");
  // let currentTime = moment().tz("America/New_York").hour(3).minute(30);
  let endTime = moment().tz("America/New_York").hour(4).minute(30);

  let reply = '';
  if (all !== true){
    reply = `Nudging for ${clanName} by ${interaction.member}\n\n`;
  }
  else{
    reply = `Nudging every player for ${clanName} by ${interaction.member}\n\n`;
  }
  for (let attacksLeft = 4; attacksLeft >= 1; attacksLeft--){ // start at certain attacks
    //reply += `__**${attacksLeft} Attacks**__\n`
    if (playerAttacksLeft.hasOwnProperty(attacksLeft)) { // if it has attacksLeft as a property (it does)
      let players = [];
        for (let player of playerAttacksLeft[attacksLeft]) { // for each player of the dictionary {name, tag, outOfClan}
          let hasPingableRole = false;
          if (data.playersTag[player.tag]){ // if data has the playertag linked
            let userId = data.playersTag[player.tag].userId; // get the userId of user

            for (property in data.playersId[userId]){ // check if user pinged any of the pingable roles
              for (let roleId in pingableRoles){ // if roleId is in pingableRoles above 
                if (pingableRoles[roleId].roleId === property && data.playersId[userId][property] === true){ // If the same as what the user pinged, a match
                  //console.log(player.name + " has the true property " + property); // can just use name instead of ping
                  if (all === true){
                    players.push(`* <@${userId}>`);
                    hasPingableRole = true;
                    break;
                  }
                  else{
                    let timeToPing = data.pingableRoles[roleId].timeToPing.split(':');
                    let desiredTime = moment().tz("America/New_York");
                    desiredTime.hour(timeToPing[0]).minute(timeToPing[1]);
                    
                    // Ping depending on time nudge is done.
                    if (currentTime.isAfter(desiredTime) && currentTime.isBefore(endTime)){
                      players.push(`* <@${userId}>`);
                    }
                    else{
                      players.push(`* ${player.name} ${data.pingableRoles[roleId].icon}`);
                    }
                    hasPingableRole = true;
                    break;
                  }
                }
                // if they have false role which means no ping 
                else if (pingableRoles[roleId].roleId === property && data.playersId[userId][property] === false){
                  players.push(`* ${player.name} ${data.pingableRoles[roleId].icon}`);
                  hasPingableRole = true;
                  break;
                }
              }
              if (hasPingableRole) break;
            }
    
            if (!hasPingableRole) {
              players.push(`* <@${userId}>`);
            }
          }
          else{
            players.push(`* ${player.name} (not linked)`);
          }
        }

        if (players.length > 0){
          reply += `__**${attacksLeft} Attacks**__\n` + players.join('\n') + '\n\n'; // next attack
        }
      }
    }
    if (outOfClan === true){
      reply += `\\* is out of clan`;
    }
    return reply;
  }

async function getAttacksLeft(abbreviation, interaction){

  const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
  let data = {}
  try {
    data = JSON.parse(fs.readFileSync(filePath))
  } catch (err) {
    console.error(err)
  }
  fs.writeFileSync(filePath, JSON.stringify(data));
  let clanName;
  for (let checkClanName in data.clans){
    let abbreviationCheck = data.clans[checkClanName].abbreviation;
    if (abbreviationCheck === abbreviation){
      // Exists, continue
      clanName = checkClanName;
      break;
    }
  }
  
  if (clanName === undefined){
    interaction.editReply("This is not a valid abbreviation to nudge.");
    return null;
  }
  
  let clantag = data.clans[clanName].clantag;

  const raceURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}/currentriverrace`;
  const clanURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}`;
  const raceData = await API.fetchData(raceURL, "RaceData", true);
  const clanData = await API.fetchData(clanURL, "ClanData", true);

  if (clanData === 404 || raceData === 404){
    let filename = 0;
    const attachment = new AttachmentBuilder(`badges/${filename}.png`);
    const embed = new EmbedBuilder()
    .setTitle("Error")
    .setDescription(`This clan does not have data for nudging.`)
    .setColor('Red')
    .setThumbnail(`attachment://${filename}.png`)
    await interaction.editReply({ embeds: [embed], files: [attachment] });
    return null;
  }
  if (raceData === 503 || clanData === 503){
    const embed = new EmbedBuilder()
    //.setTitle("Error")
    .setDescription(`Clash Royale is currently on maintainence break. Please try again later.`)
    .setColor('Red')
    await interaction.editReply({ embeds: [embed] });
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

  for (let i = 0; i < raceData.clan.participants.length; i++){
    let participant = raceData.clan.participants[i];
    if (!membersInClan[participant.tag] && !membersNotClan[participant.tag]){
      continue;
    }
    let attacksLeft = 4 - participant.decksUsedToday; // Shows how many attacks left over
    // Ensure attacksLeft is within the expected range
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

  return {clanName, clantag, playerAttacksLeft, outOfClan };
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