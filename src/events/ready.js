const { Events, ActivityType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const attacksLeft = require("../commands/utility/attacksLeft.js").attacksLeft;
const checkRace = require("../commands/utility/warRace.js").checkRace;
const updateClanInfo = require("../commands/guildInfo/findGuildChanges.js").updateClanInfo;


module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
    client.user.setActivity({
      name: "AFAM",
      type: ActivityType.Watching
    });
		// let emojis = [];

		// // Iterate over all guilds the bot is part of
		// client.guilds.cache.forEach(guild => {
		// 	// Iterate over each emoji in the guild
		// 	guild.emojis.cache.forEach(emoji => {
		// 		emojis.push({
		// 			name: emoji.name,
		// 			id: emoji.id
		// 		});
		// 	});
		// });
	
		// // Save the emoji data to a JSON file
		// fs.writeFileSync('emojis.json', JSON.stringify(emojis, null, 2));
	
		// console.log('Emoji data has been saved to emojis.json');

		archiveStaleGuildData(client);
		ensureGuildData(client);
		setInterval(scheduleClanInfo, 180000);
		setInterval(checkExpiry, 5000);
    removeRoles(client);
		scheduleAttacksLeft(client);
		scheduleRace(client);
	},
};



async function ensureGuildData(client) {
	console.log("Ensuring guilds have the data...");
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
    if (!data.guildName) {
      data.guildName = guild.name;
    } else if (data.guildName !== guild.name) {
      // If the guild name has changed, update it
      console.log(`Guild name changed from ${data.guildName} to ${guild.name}`);
      data.guildName = guild.name;
    }
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
	console.log("Setup is finished.");
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
							oldBotMessage = await channel.send(`<@&${data.clans[clanName].roleId}>, need a new link!`); // Replace 'role' with the actual role you want to ping
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

async function scheduleAttacksLeft(client) {
  cron.schedule('20 2 * * 1,5,6,7', function() {
    console.log('Running attacksLeft for all guilds');

    const directoryPath = path.join(__dirname, '..', '..', 'guildsInfo');
    fs.readdir(directoryPath, function(err, files) {
      if (err) {
        return console.error('Unable to scan directory: ' + err);
      }

      files.forEach(function(file) {
        if (path.extname(file) === '.json') {
          fs.readFile(path.join(directoryPath, file), 'utf8', function(err, data) {
            if (err) {
              return console.error('Unable to read file: ' + err);
            }
            let guildData = JSON.parse(data);

            for (const clan in guildData.clans) {
              const guild = client.guilds.cache.get(guildData.guildId);
              const channel = guild.channels.cache.get(guildData.clans[clan].warDayChannel);
              if (channel) {
                attacksLeft(guildData.clans[clan].abbreviation, guildData.guildId).then(result => {
                  channel.send({ embeds: [result.embedReturn ]});
                });
              }
            }
          });
        }
      });
    });
  }, null, true, 'America/Phoenix');
}

function removeRoles(client) {
  cron.schedule('20 2 * * *', function() {
    console.log('Removing specific roles from all players.');

    const directoryPath = path.join(__dirname, '..', '..', 'guildsInfo');
    const files = fs.readdirSync(directoryPath);

    files.forEach(function(file) {
      if (path.extname(file) === '.json') {
        const data = fs.readFileSync(path.join(directoryPath, file), 'utf8');
        let guildData = JSON.parse(data);

        // Get all role descriptions from pingableRoles
        const roleDescriptions = Object.values(guildData.pingableRoles).map(role => role.description);
        // Iterate over each player in playersId
        for (let playerId in guildData.playersId) {
          // Check if the player has any of the roles in pingableRoles
          roleDescriptions.forEach(description => {
            console.log(guildData.playersId[playerId][description]);
            if (guildData.playersId[playerId][description] === false || guildData.playersId[playerId][description] === true) {
              // Remove the role from the player
              delete guildData.playersId[playerId][description];
            }
          });
        }

        // Save the updated data back to the file
        fs.writeFileSync(path.join(directoryPath, file), JSON.stringify(guildData, null, 2));
      }
    });
  }, null, true, 'America/Phoenix');
}

async function scheduleRace(client) {
  cron.schedule('20 2 * * 1,5,6,7', function() {
    console.log('Running races for all guilds');

    const directoryPath = path.join(__dirname, '..', '..', 'guildsInfo');
    fs.readdir(directoryPath, function(err, files) {
      if (err) {
        return console.error('Unable to scan directory: ' + err);
      }

      files.forEach(function(file) {
        if (path.extname(file) === '.json') {
          fs.readFile(path.join(directoryPath, file), 'utf8', function(err, data) {
            if (err) {
              return console.error('Unable to read file: ' + err);
            }

            let guildData = JSON.parse(data);

            for (const clan in guildData.clans) {
              const guild = client.guilds.cache.get(guildData.guildId);
              const channel = guild.channels.cache.get(guildData.clans[clan].warDayChannel);
              if (channel) {
                checkRace(guildData.clans[clan].abbreviation, guildData.guildId).then(result => {
                  channel.send({ embeds: [result.embedReturn ]});
                });
              }
            }
          });
        }
      });
    });
  }, null, true, 'America/Phoenix');
}

async function scheduleClanInfo() {
  console.log('Running Clan Info Updates');

  const directoryPath = path.join(__dirname, '..', '..', 'guildsInfo');
  fs.readdir(directoryPath, async (err, files) => {
    if (err) {
      return console.error('Unable to scan directory: ' + err);
    }

    for (const file of files) {
      if (path.extname(file) === '.json') {
        try {
          const data = await readFileAsync(path.join(directoryPath, file));
          let guildData = JSON.parse(data);
          for (const clan in guildData.clans) {
            const guild = client.guilds.cache.get(guildData.guildId);
            const channel = guild.channels.cache.get(guildData.clans[clan].clanlogsChannel);
            if (channel) {
              let embeds = await updateClanInfo(guildData.clans[clan].abbreviation, guildData.guildId);
							if (embeds && embeds.length > 0) {
								for (const embed of embeds) {
									await channel.send({ embeds: [embed] });
								}
              }
            }
          }
        } catch (readFileErr) {
          console.error('Unable to read file: ' + readFileErr);
        }
      }
    }
  });
}

function readFileAsync(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

async function archiveStaleGuildData(client) {
  console.log("Archiving data for guilds no longer visible...");

  // Get the list of guild IDs the bot is currently in
  const currentGuildIds = client.guilds.cache.map(guild => guild.id);

  // Path to the guildsInfo directory
  const guildsInfoPath = path.join(__dirname, '..', '..', 'guildsInfo');
  // Path to the archive directory
  const archivePath = path.join(__dirname, '..', '..', 'archivedGuildsInfo');

  // Ensure the archive directory exists
  if (!fs.existsSync(archivePath)) {
    fs.mkdirSync(archivePath);
  }

  // Read the directory contents
  fs.readdir(guildsInfoPath, (err, files) => {
    if (err) {
      console.error("Error reading the guildsInfo directory:", err);
      return;
    }

    // Iterate over each file in the directory
    files.forEach(file => {
      // Extract the guild ID from the filename
      const fileGuildId = file.replace('.json', '');

      // If the file's guild ID is not in the current list of guild IDs, move the file to the archive
      if (!currentGuildIds.includes(fileGuildId)) {
        const oldFilePath = path.join(guildsInfoPath, file);
        const newFilePath = path.join(archivePath, file);
        fs.rename(oldFilePath, newFilePath, (err) => {
          if (err) {
            console.error(`Error moving file for guild ID ${fileGuildId}:`, err);
          } else {
            console.log(`Archived data file for guild ID ${fileGuildId} not seen by the bot.`);
          }
        });
      }
    });
  });

  console.log("Archiving process completed.");
}