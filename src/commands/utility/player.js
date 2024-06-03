const API = require("../../API.js");
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("players")
    .setDescription("Show the accounts that a player has linked.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Which user would you like to see?").setRequired(true)
    ),

  async execute(interaction){
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "players") {
      await interaction.deferReply();
      var user = interaction.options?.getMember("user"); // gets full user
      let guildId = interaction.guild.id
      const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guildId}.json`);
      let data = {};
      try {
        data = JSON.parse(fs.readFileSync(filePath));
      } catch (err) {
        console.error(err);
        return;
      }

      if(!data.playersId[user.id]){
        const embed = new EmbedBuilder()
        //.setTitle("Error")
        .setDescription(`This user <@${user.id}> did not have any players linked.`)
        .setColor('Red')
        await interaction.editReply({ embeds: [embed] });
        return null;
      }


      //console.log("user exists");
      const emojiPath = path.join(__dirname, '..', '..', '..', `emojis.json`);
      let emojis = {}
      try {
        const data = fs.readFileSync(emojiPath, 'utf8');
        emojis = JSON.parse(data); // Parse the JSON string into an array
      } catch (err) {
        console.error('Error loading emojis:', err);
        return []; // Return an empty array in case of an error
      }


      description = "";
      let playertags = data.playersId[user.id].playertags;
      let accounts = [];

      // Fetch all player data first
      for (const tag of playertags) {
        let account = await playertag(tag);
        if (account) {
          accounts.push(account);
        }
      }

      // Sort accounts by expLevel in descending order
      accounts.sort((a, b) => b.expLevel - a.expLevel);

      // Construct the description with sorted accounts
      accounts.forEach((account, index) => {
        let tag = account.tag.substring(1);
        description += `**${index + 1}**. [${account.name}](https://royaleapi.com/player/${tag}) <:experience${account.expLevel}:${findEmojiId(emojis, `experience${account.expLevel}`)}> \n\n`;
      });


      let username = user.nickname || user.user.username;
      const embedReturn = new EmbedBuilder()
      .setTitle(`${username} Accounts`)
      .setThumbnail(process.env.BOT_IMAGE)
      .setColor("Purple")
      .setDescription(description);

      

      await interaction.editReply({ embeds: [embedReturn] });
    }
  }
};

async function playertag(playertag) {
  if (playertag.charAt(0) !== '#') playertag = '#' + playertag;
  const playerURL = `https://proxy.royaleapi.dev/v1/players/${encodeURIComponent(
    playertag
  )}`;
  const playerData = await API.fetchData(playerURL, "PlayerData", false);
  if (playerData === 404 || playerData === 503){
    return null;
  }
  // let errorCode = API.checkStatus(null, playerData, playertag);
  // //console.log(errorCode);
  // if (!errorCode.status) {
  //   // return errorCode, if error code, interaction already replied
  //   return errorCode;
  // }

  // Embed stuff

  return playerData;
}

function findEmojiId(emojiJson, nameLookingFor) {
  let emojiId = emojiJson.find(emoji => {
    // Ensure both values are strings and trim any whitespace
    const emojiName = String(emoji.name).trim();
    const trimmedName = String(nameLookingFor).trim();

    return emojiName === trimmedName;
  })?.id;

  if (emojiId) {
    //console.log(`Found emoji ID: ${emojiId}`);
    return emojiId;
  } else {
    console.error(`Emoji not found for: ${nameLookingFor}`);
    return null;
  }
}
