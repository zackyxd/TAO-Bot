const { Events } = require('discord.js');
const API = require("../../API.js");
const path = require('path');
const fs = require('fs');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    const guild = message.guild;
    const channel = await guild.channels.cache.get(message.channelId);

    const filePath = path.join(__dirname, '..', '..', '..', 'guildInfo', `${guild.id}.json`);
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
    }
    // if channel not #test-bot
    console.log(data.linkChannel);
    if (channel.id !== data.linkChannel){
      console.log("not link channel");
      return;
    }
    else{
      let parsedMessage = (message.content).split(/\s+/);
      console.log(parsedMessage);
      var clan;
      var clanLink;
      let foundClan = false;

      let promises = parsedMessage.map(async (msg) => {
        let regex = /\/invite\/.*tag=([^&]*)/;
        let match = msg.match(regex);
        if (match === null || match[1] === undefined){
          return;
        }
        clan = await getClanName(match[1]);
        if (match && !foundClan){
          message.delete().then(msg => console.log("Deleted message")).catch(console.error);
          foundClan = true;
          clan = await getClanName(match[1]);
          clanLink = msg;
          return true;
        }
        return false;
      });

      await Promise.all(promises);
      if (!foundClan) {
        return;
      }
      
      const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
      //const threeDaysInSeconds = 3 * 24 * 60 * 60; // Number of seconds in 3 days
      const threeDaysInSeconds = 5; // Number of seconds in 3 days
      const expiryTime = currentTime + threeDaysInSeconds; // Expiry time 3 days from now

      const sentMessage = await channel.send({ content: `[${clan.name}](<${clanLink}>): Expire <t:${expiryTime}:R>`});
      const messageId = sentMessage.id;


      

      // Check if the clan is already in the array
      const index = data.clans.findIndex(item => item.clanName === clan.name);

      if (index !== -1) {
        // If the clan is already in the array, update the existing object
        data.clans[index].expiryTime = expiryTime;
        data.clans[index].channelId = message.channelId;
        data.clans[index].messageId = messageId; // store message ID
      } else {
        // If the clan is not in the array, add a new object
        data.clans.push({
          clanName: clan.name,
          expiryTime: expiryTime,
          channelId: message.channelId,
          messageId: messageId
        });
      }
      // Store the updated array in the file
      fs.writeFileSync(filePath, JSON.stringify(data));
    }
    
  }
}

async function getClanName(clantag){
  if (clantag.charAt(0) !== '#') clantag = '#' + clantag;

  const clanURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}`;
  
  const clanData = await API.fetchData(clanURL, "ClanData", true);
  return clanData;
}