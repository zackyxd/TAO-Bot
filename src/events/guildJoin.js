const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();

client.on('guildCreate', guild => {
  const data = {
    guildId: guild.id,
    clans: []
  };

  fs.writeFileSync(path.join())
});