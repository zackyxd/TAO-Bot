const API = require("../../API.js");
const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
//const Abbrev = require("../../models/02ClanAbbreviations.js");
//const User = require("../../models/02UserModel.js");
const Emoji = require('../../models/EmojiModel.js');
const path = require('path');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unlink-player")
    .setDescription("Unink a single playertag")
    .addStringOption((option) =>
      option
        .setName("playertag")
        .setDescription("playertag of user")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    var playertag = interaction.options.get("playertag").value.toUpperCase();
    if (playertag.charAt(0) !== "#") {
      playertag = "#" + playertag;
    }


    const filePath = path.join(__dirname, '..', '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err) {
      console.error(err);
      return;
    }
    let userId;
    if (data.playersTag[playertag]) {
      userId = data.playersTag[playertag].userId;
      delete data.playersTag[playertag];
      let index = data.playersId[userId].playertags.indexOf(playertag);
      if (index !== -1) {
        data.playersId[userId].playertags.splice(index, 1);
      }
      await interaction.editReply(`The player with tag \`${playertag}\` has been unlinked from <@${userId}>`);
      fs.writeFileSync(filePath, JSON.stringify(data));
    }
    else {
      await interaction.editReply(`There was no player linked to \`${playertag}\``);
    }




  }
}
