const API = require('../../API.js')
const path = require('path')
const fs = require('fs')
const {
  EmbedBuilder,
  AttachmentBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkaverageroles')
    .setDescription(
      'Grab New averages for clan selected, Zacky will update the players each week'
    )
    .addStringOption((option) =>
      option.setName("abbrev")
        .setDescription("Name of Clan Abbreviation")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return

    if (interaction.commandName === 'checkaverageroles') {
      await interaction.deferReply();
      let guild = interaction.guild
      // console.log(guild.id)


      let clanAbbrev = interaction.options.get("abbrev").value.toUpperCase();

      const filePath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'guildsInfo',
        `${guild.id}.json`
      )
      let data = {}
      try {
        data = JSON.parse(fs.readFileSync(filePath))
      } catch (err) {
        console.error(err)
        return
      }

      let playerAverageData;
      try {
        playerAverageData = fs.readFileSync(`./averages/${clanAbbrev}playeraverages.txt`, 'utf-8')
      } catch (error) {
        const embed = new EmbedBuilder()
          //.setTitle("Error")
          .setDescription(`Error reading file for averages`)
          .setColor('Red')
        await interaction.editReply({ embeds: [embed] });
        return null;
      }

      let lines = playerAverageData.split('\n');

      let playerAverages = {};
      let currentWarType = 0;

      let firstLineProcessed = false;
      for (let line of lines) {

        if (firstLineProcessed !== true) {
          let grabWords = line.split(' ');
          currentWarType = grabWords[0].trim();
          console.log(currentWarType);
          firstLineProcessed = true;
          // continue;
        }

        let parts = line.split('\t');
        // The player tag is the first part
        let playertag = parts[0];

        // The average number is the last part
        let average = parseFloat(parts[parts.length - 1]);

        if (playertag.charAt(0) !== "#") {
          playertag = "#" + playertag;
        }
        if (data.playersTag[playertag]) {
          let userId = data.playersTag[playertag].userId;
          console.log(userId);
          playerAverages[playertag] = { average, userId };
        }
        else {
          // console.log("no account " + parts[1] + "\n");
          // noLink += `${parts[1]} did not have a Discord Account linked, but has an average of ${average}\n`
        }
      }

      console.log(currentWarType);
      console.log(typeof (currentWarType));
      let roles = [];
      if (currentWarType === "5") {
        // 5k roles
        roles = [
          { id: '1056432944408973372', threshold: 190 },
          { id: '1056433100420284437', threshold: 200 },
          { id: '1056433107596742667', threshold: 210 },
          { id: '1136109175026487357', threshold: 220 }
        ];

        // test role:
        // roles = [
        //   { id: '1262415183901364225', threshold: 200 }
        // ]
      }
      else {
        // 4k roles
        roles = [
          { id: '1056432341322584104', threshold: 190 },
          { id: '1056432268345876610', threshold: 200 },
          { id: '1056432341322584104', threshold: 210 },
        ];

      }

      let reply = "";
      for (let playertag in playerAverages) {
        let playerData = playerAverages[playertag];

        roles.sort((a, b) => b.threshold - a.threshold);
        try {
          let member = await guild.members.fetch(playerData.userId);
          for (let role of roles) {
            // check if member has this role or higher one:
            if (await member.roles.cache.has(role.id) || roles.some(r => r.threshold > role.threshold && member.roles.cache.has(r.id))) {
              console.log(playerData.userId + " already has the highest role");
              break;
            }

            if (playerData.average >= role.threshold) {
              for (let otherRole of roles) {
                if (otherRole.id !== role.id && member.roles.cache.has(otherRole.id)) {
                  await member.roles.remove(otherRole.id);
                }
              }
              await member.roles.add(role.id);
              // Fetch member
              reply += `<@${playerData.userId}> has earned the new role for ${currentWarType}k ${role.threshold}+\n`;
              await new Promise(resolve => setTimeout(resolve, 300))
              // console.log(playerData.name + " has earned the new role: " + `<@&${role.id}>`)
              break;
            }
          }
        } catch (error) {
          // console.log(error);
        }
      }

      if (reply !== "") {
        const embed = new EmbedBuilder()
          .setTitle("New Roles Given for " + clanAbbrev)
          .setThumbnail(process.env.BOT_IMAGE)
          .setDescription(reply)
          .setColor('Purple')

        await interaction.editReply({ embeds: [embed] });
        return;
      }
      else {
        const embed = new EmbedBuilder()
          .setDescription("No new roles given")
          // .setThumbnail(process.env.BOT_IMAGE)
          .setColor('Purple')
        await interaction.editReply({ embeds: [embed] });
      }
    }
  }
}