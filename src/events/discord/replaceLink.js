const { Events } = require('discord.js');
const { parse } = require('dotenv');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;

    const guild = message.guild;
    const channel = await guild.channels.cache.get(message.channelId);

    // if channel not #test-bot
    if (!channel === '1183749954787889172'){
      return;
    }
    else{
      let parsedMessage = (message.content).split(/\s+/);
      
      let promises = parsedMessage.map((msg) => {
        let regex = /\/invite\/.*tag=([^&]*)/;
        let match = msg.match(regex);
        console.log("tesT");
        if (match){
          console.log(match[1] + " is the match");
          getClanName()
        }
      })
    }
    // let url = "https://link.clashroyale.com/invite/clan/en?tag=9U82JJ0Y&token=3csjbgtj&platform=iOS";
    // let match = url.match(regex);
    // if (match) {
    //   console.log("The tag is: " + match[1]);
    // }
  }
}

async function getClanName(clantag){
  if (clantag.charAt(0) !== '#') clantag = '#' + clantag;
  const clanURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(clantag)}`;
}