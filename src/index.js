require('dotenv/config');
const mongoose = require('mongoose');
const API = require("./API.js");
const path = require('node:path');
const fs = require('node:fs');

const { Client, Collection, Events, GatewayIntentBits, ActivityType } = require('discord.js');
 
global.client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessageReactions,
    ],
});

client.commands = new Collection();
client.cooldowns = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const loadEvents = (dir = path.join(__dirname, 'events')) => {
	fs.readdirSync(dir).forEach(file => {
			const filePath = path.join(dir, file);
			const stat = fs.lstatSync(filePath);
			if (stat.isDirectory()) {
					// If file is a directory, recursive call recurDir
					loadEvents(filePath);
			} else if (file.endsWith('.js')) {
					const event = require(filePath);
					if (event.once) {
							client.once(event.name, (...args) => event.execute(...args));
					} else {
							client.on(event.name, (...args) => event.execute(...args));
					}
			}
	});
};
loadEvents();

// Add the guildCreate event
client.on('guildCreate', guild => {
	// This event will run whenever the bot joins a guild.
	let data = {
			guildId: guild.id,
			clans: []
	};
	// We can save the settings for this guild to the disk. This is great for things like per-guild prefixes and role names.
	// We can use the JSON stringify function to make the data readable and then write to the file.
	fs.writeFileSync(`./guildInfo/${guild.id}.json`, JSON.stringify(data, null, 2));
});

(async () => {
  try {

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to mongoDB.");
    client.login(process.env.TOKEN);
  
  } 
  catch (error) {
    console.log(`Error: ${error}`);
  }
})();


module.exports = client; // Export the client