const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const API = require("../../API.js");
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("delete-clan")
  .setDescription("Delete a clan from your server.")
  .addStringOption(option =>
    option.setName("abbreviation")
    .setDescription("What is the abbreviation you want to use for this clan?")
    .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction){
    await interaction.deferReply({ephemeral: true});
    const guild = interaction.guild;
    const abbrev = interaction.options.get("abbreviation").value.toLowerCase();

    const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guild.id}.json`);

    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
    }
    

    // Modify the specific clan in the dictionary based on the abbreviation field
    for (let clanname in data.clans) {
      if (data.clans.hasOwnProperty(clanname)) {
        if (data.clans[clanname].abbreviation === abbrev) {
          // Delete specific fields from the clan
          delete data.clans[clanname].clantag;
          delete data.clans[clanname].roleId;
          delete data.clans[clanname].abbreviation;
          fs.writeFileSync(filePath, JSON.stringify(data));
          await interaction.editReply(`The clan with abbreviation \`${abbrev}\` has been deleted from the server.`);
          return;
        }
      }
    }
    await interaction.editReply(`No clan with abbreviation \`${abbrev}\` exists in the server.`);
  }
}

async function checkClan(interaction, clantag) {
  if (clantag.charAt(0) !== '#') clantag = '#' + clantag;
  const clanURL = `https://proxy.royaleapi.dev/v1/clans/${encodeURIComponent(
    clantag
  )}`;
  const clanData = await API.fetchData(clanURL, "ClanData", true);
  if (clanData === 404){
    let filename = 0;
    const attachment = new AttachmentBuilder(`badges/${filename}.png`);
    const embed = new EmbedBuilder()
    .setTitle("Error")
    .setDescription(`This tag \`${clantag}\` does not exist.`)
    .setColor('Red')
    .setThumbnail(`attachment://${filename}.png`)
    interaction.editReply({ embeds: [embed], files: [attachment] });
    return null;
  }
  if (clanData === 503){
    const embed = new EmbedBuilder()
    .setTitle("Error")
    .setDescription(`Clash Royale is currently on maintainence break. Please try again later.`)
    .setColor('Red')
    interaction.editReply({ embeds: [embed] });
    return null;
  }
  else{
    return clanData;
  }
  // let errorCode = API.checkStatus(interaction, clanData);
  // if (!errorCode) {
  //   // return errorCode, if error code, interaction already replied
  //   return errorCode;
  // }
}