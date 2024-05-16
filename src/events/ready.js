const { Events, ActivityType } = require('discord.js');
const fs = require('fs');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
    client.user.setActivity({
      name: "the server",
      type: ActivityType.Watching
    });

		setInterval(checkExpiry, 1000);
	},
};

async function checkExpiry() {
	let data = [];
	try { 
		data = JSON.parse(fs.readFileSync('expiryData.json'));
	}
	catch (err){
		console.error(err);
	}
	const currentTime = Math.floor(Date.now() / 1000); // unix in seconds

	// Iterate over the array of clan objects
	for (let i = 0; i < data.length; i++) {
		// If 3 days have passed, delete the old message and send a new one
		if (currentTime >= data[i].expiryTime) {
				const channel = await client.channels.fetch(data[i].channelId);
				const oldMessage = await channel.messages.fetch(data[i].messageId);
				oldMessage.delete(); // Delete the old message
				channel.send(`@${data[i].clanName}, 3 days have passed!`); // Replace 'role' with the actual role you want to ping

				// Remove the clan object from the array
				data.splice(i, 1);
				i--; // Decrement i as the array length has decreased
		}
	}

	// update array
	fs.writeFileSync('expiryData.json', JSON.stringify(data));
}
