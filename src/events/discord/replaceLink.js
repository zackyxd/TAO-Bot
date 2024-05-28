const { Events } = require('discord.js');
const API = require("../../API.js");
const path = require('path');
const fs = require('fs');

module.exports = {
  name: Events.MessageCreate,
  async execute(originalMessage) {
    if (originalMessage.author.bot) return;

    const guild = originalMessage.guild;
    const channel = await guild.channels.cache.get(originalMessage.channelId);

    const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guild.id}.json`);
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
    }
    // if channel not #test-bot
    if (channel.id !== data.linkChannel){
      return;
    }
    else{
      let parsedMessage = (originalMessage.content).split(/\s+/);
      console.log(parsedMessage);
      var clan;
      var clanLink;
      let foundClan = false;

      let promises = parsedMessage.map(async (msg) => {
        let regex = /\/invite\/.*tag=([^&]*)/;
        let regexLink = /https:\/\/link\.clashroyale\.com\/invite\/clan\/en\?tag=[^&]*&token=[^&]*&platform=(android|iOS)/;
        let match = msg.match(regex);
        let apiLink = msg.match(regexLink);
        if (match === null || match[1] === undefined){
          return;
        }
        clan = await getClanName(match[1]);
        if (match && !foundClan){
          originalMessage.delete().then(msg => console.log("Deleted message")).catch(console.error); // delete the real user's message with the link
          foundClan = true; // make the clan found
          clan = await getClanName(match[1]); // get clan info
          clanLink = apiLink[0]; // the clan link is the msg that was parsed 
          return true; // found link
        }
        return false; // no link found
      });

      await Promise.all(promises);
      if (!foundClan) {
        return;
      }
      
      const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp in seconds
      //const threeDaysInSeconds = 3 * 24 * 60 * 60; // Number of seconds in 3 days
      const threeDaysInSeconds = 5; // Number of seconds in 3 days
      const expiryTime = currentTime + threeDaysInSeconds; // Expiry time 3 days from now

      const sentMessage = await channel.send({ content: `[${clan.name}](<${clanLink}>): Expire <t:${expiryTime}:R>`}); // bot's message with countdown
      const messageId = sentMessage.id; // countdown message id

      if (clan.name in data.clans) {
        if ('oldBotMessageId' in data.clans[clan.name]) {
          try {
            const oldBotChannel = await client.channels.fetch(data.clans[clan.name].oldBotChannelId);
            const oldBotMessage = await oldBotChannel.messages.fetch(data.clans[clan.name].oldBotMessageId);
            oldBotMessage.delete();
            delete data.clans[clan.name].oldBotMessageId;
            delete data.clans[clan.name].oldBotChannelId;
          }
          catch (error) {
            console.log("Old bot message was deleted..., removing from file");
            delete data.clans[clan.name].oldBotMessageId;
            delete data.clans[clan.name].oldBotChannelId;            
          }
        }

        // If the clan is already in the array, update the existing object
        if (data.clans[clan.name].expiryTime <= expiryTime){ // new link posted
          try {
            data.clans[clan.name].expiryTime = expiryTime;
            let deleteOriginalCoutndown = await channel.messages.fetch(data.clans[clan.name].messageId);
            deleteOriginalCoutndown.delete();
            data.clans[clan.name].messageId = messageId;
          } catch (error) {
            data.clans[clan.name].expiryTime = expiryTime;
            data.clans[clan.name].messageId = messageId;
          }
        }
        else{
          // If new link posted, change to that message expiry. 
          data.clans[clan.name].expiryTime = expiryTime;
          data.clans[clan.name].channelId = originalMessage.channelId;
          data.clans[clan.name].messageId = messageId; // store message ID
        }

      } else {
        // If the clan is not in the array, add a new object
        data.clans[clan.name] = {
          clantag: clan.tag,
          expiryTime: expiryTime,
          channelId: originalMessage.channelId,
          messageId: messageId
        };
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