const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const API = require("../../API.js");
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
  .setName("create-clan")
  .setDescription("Add a clan to your server.")
  .addStringOption(option =>
    option.setName("clantag")
    .setDescription("What is the clantag for your clan?")
    .setRequired(true))
  .addStringOption(option =>
    option.setName("abbreviation")
    .setDescription("What is the abbreviation you want to use for this clan?")
    .setRequired(true))
  .addRoleOption(option =>
    option.setName('role')
    .setDescription('What role is used for this clan?')
    .setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction){
    await interaction.deferReply({ephemeral: true});
    const guild = interaction.guild;
    let clantag = interaction.options.get("clantag").value.toUpperCase();
    const abbrev = interaction.options.get("abbreviation").value.toLowerCase();
    const roleId = interaction.options.get("role")?.value;
    if (clantag.charAt(0) !== '#') clantag = '#' + clantag;

    const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${guild.id}.json`);

    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
      return;
    }
    
    let clan = await checkClan(interaction, clantag);
    if (clan === null){
      return;
    }

    // Use the clan's tag or abbreviation as the key in the dictionary
    if (!data.clans[clan.name]) {
      data.clans[clan.name] = {
          abbreviation: abbrev,
          clantag: clan.tag,
          roleId: roleId,
      };
    } else {
        data.clans[clan.name].abbreviation = abbrev;
        data.clans[clan.name].clantag = clan.tag;
        data.clans[clan.name].roleId = roleId;
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data));

    let reply = `The clan \`${clan.name}\` has been been set with the abbreviation \`${abbrev}\``;
    if (roleId !== undefined){
      reply += ` with the role <@&${roleId}>`
    }
    await interaction.editReply(reply);
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
    .setDescription(`This clantag \`${clantag}\` does not exist.`)
    .setColor('Red')
    .setThumbnail(`attachment://${filename}.png`)
    await interaction.editReply({ embeds: [embed], files: [attachment] });
    return null;
  }
  if (clanData === 503){
    const embed = new EmbedBuilder()
    .setTitle("Error")
    .setDescription(`Clash Royale is currently on maintainence break. Please try again later.`)
    .setColor('Red')
    await interaction.editReply({ embeds: [embed] });
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