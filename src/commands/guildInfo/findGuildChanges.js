const API = require("../../API.js");
const path = require('path');
const fs = require('fs').promises; // Make sure to use the promise-based version of fs

const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
//let findEmoji = await Emoji.findOne({ emojiName: clansArray[i].badgeId })

async function getNewClanInfo(abbrev, guildId){
  const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guildId}.json`);

  let data = {};
  try {
    data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  }
  catch (err) {
    console.error(err);
  }

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

  const clanURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}`;
  let clanData = await API.fetchData(clanURL, "ClanData", true);
  if (clanData === 503 || clanData === 404){
    return null;
  }


    // Extract the memberList from the clanData
  const memberList = clanData.memberList;

  // Map through the memberList and pick only the tag, name, and role
  const membersList = memberList.map(member => ({
    tag: member.tag,
    name: member.name,
    role: member.role,
    arena: (member.arena.name).toLowerCase().replace(/\s/g, ''),
    trophies: member.trophies
  }));

  const newClanData = {
    "type": clanData.type,
    "clantag": clanData.tag,
    "description": clanData.description,
    "badgeId": clanData.badgeId,
    "clanWarTrophies": clanData.clanWarTrophies,
    "location": clanData.location.name,
    "members": clanData.members,
    "membersList": membersList,
  }
  return newClanData;

}

async function updateClanInfo(abbrev, guildId) {
  console.log("Checking clan info...");
  const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guildId}.json`);
  let oldData = {};
  try {
    oldData = JSON.parse(await fs.readFile(filePath));
  } catch (err) {
    console.error(err);
    return;
  }

  let newClanInfo = await getNewClanInfo(abbrev, guildId);
  if (!newClanInfo) {
    console.error('Failed to fetch new clan info');
    return;
  }

  // Find the clan by abbreviation
  let clanName = Object.keys(oldData.clans).find(name => oldData.clans[name].abbreviation === abbrev);
  if (!clanName) {
    console.error(`Clan with abbreviation ${abbrev} not found.`);
    return;
  }
  console.log("Beginning updating clan info for " + clanName);

  // Compare old and new member lists to find changes
  const oldMembersList = oldData.clans[clanName]?.clanInfo?.membersList || [];
  const newMembersList = newClanInfo.membersList;
  const memberChanges = compareClanMembers(oldMembersList, newMembersList); // get member changes
  // Process the member changes to create embeds
  const memberChangeEmbeds = await processMemberChanges(memberChanges, oldData, newClanInfo, clanName, newClanInfo.clantag);

  const warTrophyChange = compareWarTrophies(oldData.clans[clanName], newClanInfo) // get war trophy change
  let warTrophyChangeEmbed;
  if (warTrophyChange.hasChanged){
    warTrophyChangeEmbed = await createWarTrophyChangeEmbed(warTrophyChange, newClanInfo, clanName, newClanInfo.badgeId);
  }
  const embedsToSend = memberChangeEmbeds;
  if (warTrophyChangeEmbed){
    embedsToSend.push(warTrophyChangeEmbed);
  }


// Update the clanInfo in the old data with the new members list and other properties
if (!oldData.clans[clanName].clanInfo) {
  oldData.clans[clanName].clanInfo = {}; // Initialize clanInfo if it doesn't exist
}
  const clanInfo = oldData.clans[clanName].clanInfo;
  clanInfo.clantag = newClanInfo.clantag;
  clanInfo.membersList = newMembersList;
  clanInfo.type = newClanInfo.type;
  clanInfo.description = newClanInfo.description;
  clanInfo.badgeId = newClanInfo.badgeId;
  clanInfo.clanWarTrophies = newClanInfo.clanWarTrophies;
  clanInfo.location = newClanInfo.location;
  clanInfo.members = newClanInfo.members;

  // Save the updated data back to the file
  // Save the updated data back to the file asynchronously
  try {
    await fs.writeFile(filePath, JSON.stringify(oldData, null, 2));
    console.log("Finished updating clan info for " + clanName);
  } catch (err) {
    console.error("Error writing file: ", err);
  }

  return embedsToSend;
}

function compareClanMembers(oldMembersList, newMembersList) {
  const oldMembers = new Map(oldMembersList.map(member => [member.tag, member]));
  const newMembers = new Map(newMembersList.map(member => [member.tag, member]));

  const membersJoined = newMembersList.filter(member => !oldMembers.has(member.tag));
  const membersLeft = oldMembersList.filter(member => !newMembers.has(member.tag));

  const roleChanges = newMembersList.filter(member => 
    oldMembers.has(member.tag) && member.role !== oldMembers.get(member.tag).role
  ).map(member => ({
    tag: member.tag,
    name: member.name,
    oldRole: oldMembers.get(member.tag).role,
    newRole: member.role,
    arena: member.arena,
    trophies: member.trophies
  }));
  return { membersJoined, membersLeft, roleChanges };
}

function compareWarTrophies(oldData, newData){

  let oldTrophies = oldData?.clanInfo?.clanWarTrophies || 0;
  let newTrophies = newData.clanWarTrophies;
  const change = newTrophies - oldTrophies;
  return {
    hasChanged: change !== 0,
    change: change,
    oldTrophies: oldTrophies,
    newTrophies: newTrophies,
  };
}

async function createWarTrophyChangeEmbed(warTrophyChange, newClanInfo, clanName, badgeId, clantag){
  let description, color;
  clantag = (newClanInfo.clantag).substring(1);
  if (warTrophyChange.change > 0){
    description = `**War Trophy Increase!**\n`;
    description += `<:currentTrophies:1192213718294085702>\`${warTrophyChange.oldTrophies}\` → <:currentTrophies:1192213718294085702>\`${warTrophyChange.newTrophies}\``;
    color = 0x00FF00; // Green
  }
  else{
    description = `**War Trophy Decrease!**\n`;
    description += `<:currentTrophies:1192213718294085702>\`${warTrophyChange.oldTrophies}\` → <:currentTrophies:1192213718294085702>\`${warTrophyChange.newTrophies}\``;
    color = 0xFF0000; // Red
  }
  const badgeIdIcon = await getLink(badgeId + ".png");
  const embed = new EmbedBuilder()
  .setAuthor({ name: `${clanName}`, iconURL: badgeIdIcon, url: `https://royaleapi.com/clan/${clantag}` })
  .setColor(color)
  //.setTitle(title)
  .setDescription(description)
  //.setFooter({ text: user.username, iconURL: user.displayAvatarURL() })
  .setTimestamp();
  return embed;
}

async function processMemberChanges(memberChanges, oldData, newClanInfo, clanName, clantag) {
  let embedsToSend = [];

  // Process membersJoined asynchronously
  const joinedPromises = memberChanges.membersJoined.map(async member => {
    let discordId = "";
    let tag = member.tag;
    if (oldData.playersTag && oldData.playersTag[tag]) {
      discordId = oldData.playersTag[tag].userId;
    }
    return createMemberChangeEmbed(member, discordId, 'joined', newClanInfo.members, clanName, newClanInfo.badgeId, clantag);
  });

  // Process membersLeft asynchronously
  const leftPromises = memberChanges.membersLeft.map(async member => {
    let discordId = "";
    let tag = member.tag;
    if (oldData.playersTag && oldData.playersTag[tag]) {
      discordId = oldData.playersTag[tag].userId;
    }
    return createMemberChangeEmbed(member, discordId, 'left', newClanInfo.members, clanName, newClanInfo.badgeId, clantag);
  });

  // Process roleChanges asynchronously
  const roleChangePromises = memberChanges.roleChanges.map(async member => {
    let discordId = "";
    let tag = member.tag;
    if (oldData.playersTag && oldData.playersTag[tag]) {
      discordId = oldData.playersTag[tag].userId;
    }
    const changeType = (isPromotion(member.oldRole.toLowerCase(), member.newRole.toLowerCase())) ? 'promoted' : 'demoted';
    return createMemberChangeEmbed(member, discordId, changeType, newClanInfo.members, clanName, newClanInfo.badgeId, clantag);
  });

  // Combine all promises and wait for them to resolve
  const allPromises = [...joinedPromises, ...leftPromises, ...roleChangePromises];
  const resolvedEmbeds = await Promise.all(allPromises);

  // Concatenate the resolved embeds to the embedsToSend array
  embedsToSend = embedsToSend.concat(resolvedEmbeds);

  // Return the array of embeds
  return embedsToSend;
}

async function createMemberChangeEmbed(member, discordId, changeType, memberCount, clanName, badgeId, clantag){
  let title, description, color;
  let tag = (member.tag).substring(1);
  clantag = (clantag).substring(1);
  let oldRole = getRoleDisplayName(member.oldRole);
  let newRole = getRoleDisplayName(member.newRole);
  let role = getRoleDisplayName(member.role);
  const arenaIconId = await getId(member.arena);
  switch (changeType) {
    case 'joined':
      description = `**${role} joined!**\n`;
      description += `<:${member.arena}:${arenaIconId}>\`${member.trophies}\` [${member.name}](<https://royaleapi.com/player/${tag}>)`;
      color = 0x00FF00; // Green
      break;
    case 'left':
      description = `**${role} left!**\n`;
      description += `<:${member.arena}:${arenaIconId}>\`${member.trophies}\` [${member.name}](<https://royaleapi.com/player/${tag}>)`;
      color = 0xFF0000; // Red
      break;
    case 'promoted':
      description = `**Promotion: ${oldRole} → __${newRole}__**\n`;
      description += `<:${member.arena}:${arenaIconId}>\`${member.trophies}\` [${member.name}](<https://royaleapi.com/player/${tag}>)`;
      color = 0x0000FF; // Blue
      break;
    case 'demoted':
      description = `**Demotion: ${oldRole} → __${newRole}__**`;
      description = `<:${member.arena}:${arenaIconId}>\`${member.trophies}\` [${member.name}](<https://royaleapi.com/player/${tag}>)`;
      color = 0xFFFF00; // Yellow
      break;
    default:
      description = 'Unknown Member Update';
      description = `${member.name}.`;
      color = 0x808080; // Grey
  }
  const badgeIdIcon = await getLink(badgeId + ".png");
  try {
    const user = await client.users.fetch(discordId);
    const embed = new EmbedBuilder()
    .setAuthor({ name: `${clanName} (${memberCount}/50)`, iconURL: badgeIdIcon })
    .setColor(color)
    //.setTitle(title)
    .setDescription(description)
    .setFooter({ text: user.username, iconURL: user.displayAvatarURL() })
    .setTimestamp();
    return embed;
  } catch (error) {
    const embed = new EmbedBuilder()
    .setAuthor({ name: `${clanName} (${memberCount}/50)`, iconURL: badgeIdIcon, url: `https://royaleapi.com/clan/${tag}/war/race` })
    .setColor(color)
    //.setTitle(title)
    .setDescription(description)
    //.setFooter({ text: user.username, iconURL: user.displayAvatarURL() })
    .setTimestamp();
    return embed;
    
  }
}



function isPromotion(oldRole, newRole){
  const roles = ['member', 'elder', 'coLeader', 'leader'];
  const oldRoleIndex = roles.indexOf(oldRole);
  const newRoleIndex = roles.indexOf(newRole);
  return newRoleIndex > oldRoleIndex;
}

function getRoleDisplayName(role) {
  const roleMap = {
    member: "Member",
    elder: "Elder",
    coLeader: "Co-leader",
    leader: "Leader"
  };
  return roleMap[role] || "Unknown Role"; // Default to "Unknown Role" if the role is not found
}

// Function to get ordinal suffix
function getOrdinalSuffix(i) {
  let j = i % 10,
  k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

module.exports.updateClanInfo = updateClanInfo;

// (async () => {
//   try {
//     await updateClanInfo('balls', '1182482429299138671');
//   } catch (err) {
//     console.error(err);
//   }
// })();


async function getLink(key) {
  try {
    // Read the JSON file asynchronously
    const data = await fs.readFile('imageLinks.json', 'utf8');
    const imageLinks = JSON.parse(data);

    // Check if the key exists in the JSON object
    if (imageLinks.hasOwnProperty(key)) {
      return imageLinks[key]; // Return the link associated with the key
    } else {
      return 'Key not found'; // Key does not exist in the JSON object
    }
  } catch (err) {
    console.error('Error reading file:', err);
    return 'Error reading file';
  }
}

async function getId(key) {
  try {
    // Read the JSON file asynchronously
    const data = await fs.readFile('emojis.json', 'utf8');
    const emojis = JSON.parse(data);

    // Find the object in the array with the matching 'name' property
    const emoji = emojis.find(emoji => emoji.name === key);
    if (emoji) {
      return emoji.id; // Return the 'id' associated with the key
    } else {
      return 'Key not found'; // Key does not exist in the array
    }
  } catch (err) {
    console.error('Error reading file:', err);
    return 'Error reading file';
  }
}
