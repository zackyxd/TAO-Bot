const { Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
    client.user.setActivity({
      name: "the server",
      type: ActivityType.Watching
    });
		setInterval(checkExpiry, 5000);
		ensureGuildData(client);
	},
};

async function ensureGuildData(client) {
  // Iterate over each guild the bot is in
  client.guilds.cache.forEach(async (guild) => {
    const filePath = path.join(__dirname, '..', '..', 'guildsInfo', `${guild.id}.json`);
    let data = {};
    try { 
      // Try to read the existing data
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      // If the file doesn't exist or can't be read, initialize an empty object
      data = {};
    }

    // Add missing fields to the data
    if (!data.guildId) data.guildId = guild.id;
    if (!data.clans) data.clans = {};
    if (!data.linkChannel) data.linkChannel = '';
    if (!data.staffRole) data.staffRole = '';
		if (!data.playersTag) data.playersTag = {};
		if (!data.playersId) data.playersId = {};
    // Add any other fields you need

    // Save the updated data to the file
    fs.writeFileSync(filePath, JSON.stringify(data));
  });
}


async function checkExpiry() {
  // Iterate over each guild the bot is in
  client.guilds.cache.forEach(async (guild) => {
    const filePath = path.join(__dirname, '..', '..', 'guildsInfo', `${guild.id}.json`);
    let data = [];
    try { 
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      //console.error(err);
			return;
    }

    const currentTime = Math.floor(Date.now() / 1000); // unix in seconds
    // Iterate over the array of clan objects
		for (let clanName in data.clans) {
			// If the current clan object has an expiryTime property
			if ('expiryTime' in data.clans[clanName]) {
				console.log("test");
				// If 3 days have passed, delete the old message and send a new one
				let oldBotMessage;
				let oldBotMessageId;
				let oldBotChannelId;
				if (currentTime >= data.clans[clanName].expiryTime) {
					try {
						const channel = await client.channels.fetch(data.clans[clanName].channelId);
						const oldMessage = await channel.messages.fetch(data.clans[clanName].messageId);
						oldMessage.delete(); // Delete the old message
						if (data.clans[clanName].roleId !== undefined){
							oldBotMessage = await channel.send(`<@&${data.clans[clanName].roleId}>, 3 days have passed!`); // Replace 'role' with the actual role you want to ping
							oldBotMessageId = oldBotMessage.id;
							oldBotChannelId = oldBotMessage.channelId;
						}
						else{
							oldBotMessage = await channel.send(`The link for ${clanName} has expired!`); // Replace 'role' with the actual role you want to ping
							oldBotMessageId = oldBotMessage.id;
							oldBotChannelId = oldBotMessage.channelId;
						}
					}
					catch {
						console.log("this message was deleted");
						delete data.clans[clanName].expiryTime;
						delete data.clans[clanName].messageId;
						delete data.clans[clanName].channelId;
					}
					data.clans[clanName].oldBotMessageId = oldBotMessageId;
					data.clans[clanName].oldBotChannelId = oldBotChannelId;
					// Remove the clan object from the array
					//data.clans.splice(i, 1);
					delete data.clans[clanName].expiryTime;
					delete data.clans[clanName].messageId;
					delete data.clans[clanName].channelId;
					clanName--; // Decrement i as the array length has decreased
				}
			}
		}

    // update array
    fs.writeFileSync(filePath, JSON.stringify(data));
  });
}

