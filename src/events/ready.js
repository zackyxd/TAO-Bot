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

		setInterval(checkExpiry, 3000);
	},
};

async function checkExpiry() {
  // Iterate over each guild the bot is in
  client.guilds.cache.forEach(async (guild) => {
    const filePath = path.join(__dirname, '..', '..', 'guildInfo', `${guild.id}.json`);
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
		for (let i = 0; i < data.clans.length; i++) {
			// If the current clan object has an expiryTime property
			if ('expiryTime' in data.clans[i]) {
				// If 3 days have passed, delete the old message and send a new one
				if (currentTime >= data.clans[i].expiryTime) {
					let oldBotMessage;
					let oldBotMessageId;
					const channel = await client.channels.fetch(data.clans[i].channelId);
					const oldMessage = await channel.messages.fetch(data.clans[i].messageId);
					oldMessage.delete(); // Delete the old message
					if (data.clans[i].roleId !== undefined){
						oldBotMessage = await channel.send(`<@&${data.clans[i].roleId}>, 3 days have passed!`); // Replace 'role' with the actual role you want to ping
						oldBotMessageId = oldBotMessage.id;
					}
					else{
						await channel.send(`It's been 3 days, the link for ${data.clans[i].clanName} has passed!`); // Replace 'role' with the actual role you want to ping
					}
					data.clans[i].oldBotMessageId = oldBotMessageId;
					// Remove the clan object from the array
					//data.clans.splice(i, 1);
					delete data.clans[i].expiryTime;
					delete data.clans[i].messageId;
					delete data.clans[i].channelId;
					i--; // Decrement i as the array length has decreased
				}
				else{
					const channel = await client.channels.fetch(data.clans[i].channelId);
					const oldBotMessage = await channel.messages.fetch(data.clans[i].oldBotMessageId);
					oldBotMessage.delete();
					delete data.clans[i].oldBotMessageId;
				}
			}
		}

    // update array
    fs.writeFileSync(filePath, JSON.stringify(data));
  });
}

