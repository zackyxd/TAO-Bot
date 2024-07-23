const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js')
//const API = require("../API.js");
const path = require('path')
const fs = require('fs')

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName)

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        )
        return
      }

      try {
        await command.execute(interaction)
      } catch (error) {
        console.error(error)
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: 'There was an error while executing this command!',
            ephemeral: true
          })
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true
          })
        }
      }
    }

    else if (interaction.isButton()) {

      if (interaction.customId.startsWith('confirm')) {
        await interaction.deferUpdate()
        const parts = interaction.customId.split('@_@')
        const userId = parts[1]
        const nickname = parts[2]
        const playertag = parts[3]

        const user = await interaction.guild.members.cache.get(userId)

        const filePath = path.join(__dirname, '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
        let data = {}
        try {
          data = JSON.parse(fs.readFileSync(filePath))
        } catch (err) {
          console.error(err)
        }

        // get member that clicked the button
        const member = await interaction.guild.members.fetch(
          interaction.user.id
        )
        // check that the member that clicked button has staff role
        if (!member.roles.cache.has(data.staffRole)) {
          await interaction.followUp({
            content:
              "You don't have permission to link accounts, please wait for one of the coleaders.",
            ephemeral: true
          })
          return
        }

        // check if already linked to someone, Change
        {
          let oldUserId = data.playersTag[playertag] ? data.playersTag[playertag].userId : '';
          if (data.playersTag[playertag] && oldUserId !== parts[1]) {
            const confirm = new ButtonBuilder()
              .setCustomId(
                `change@_@${parts[1]}@_@${parts[2]}@_@${parts[3]}@_@${interaction.user.id}`
              )
              .setLabel('Change Link?')
              .setStyle(ButtonStyle.Primary)

            const cancel = new ButtonBuilder()
              .setCustomId('cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)

            const row = new ActionRowBuilder().addComponents(cancel, confirm)

            await interaction.editReply({ components: [row] })

            await interaction.followUp({
              content: `This playertag is already linked to <@${oldUserId}>, would you like to switch this to <@${parts[1]}>? Click \`Change Link\` above if so.`,
              ephemeral: true
            })
          }
          else { // just link player
            try {
              // change name
              newConfirm = new ButtonBuilder()
                .setCustomId('confirmed')
                .setLabel('Linked!')
                .setDisabled(true)
                .setStyle(ButtonStyle.Success)

              const confirmRow = new ActionRowBuilder().addComponents(
                newConfirm
              )

              // Add to database
              // setting nickname
              try {
                await user.setNickname(nickname)
              } catch (error) {
                await interaction.followUp({ content: "Issue changing name, link should be going through still", ephemeral: true })
              }
              await interaction.message.edit({ components: [confirmRow] })

              data.playersTag[playertag] = { userId: userId }
              //console.log(data.playersId[userId]);
              if (data.playersId[userId]) {
                // if userId already exists, append playertag to existing array for multiple links
                if (!data.playersId[userId].playertags.includes(playertag)) {
                  data.playersId[userId].playertags.push(playertag);
                }
              } else {
                data.playersId[userId] = { playertags: [playertag] };
              }
              fs.writeFileSync(filePath, JSON.stringify(data))

            } catch (error) {
              // error changing or linking
              console.log(error)
              const newError = new ButtonBuilder()
                .setCustomId(
                  `confirm@_@${parts[1]}@_@${parts[2]}@_@${parts[3]}`
                )
                .setLabel('Error linking player, try again')
                //.setDisabled(true)
                .setStyle(ButtonStyle.Danger)

              const errorRow = new ActionRowBuilder().addComponents(newError)

              interaction.message.edit({ components: [errorRow] })
              await interaction.followUp({
                content:
                  "There was a problem with linking or changing this user's name. Try again, if it keeps erroring, likely a permission issue.",
                ephemeral: true
              })
            }
          }
        }
      }

      else if (interaction.customId.startsWith('cancel')) {
        const filePath = path.join(__dirname, '..', '..', 'guildsInfo', `${interaction.guild.id}.json`);
        let data = {}
        try {
          data = JSON.parse(fs.readFileSync(filePath))
        } catch (err) {
          console.error(err)
        }
        // get member that clicked the button
        const member = await interaction.guild.members.fetch(
          interaction.user.id
        )
        // check that the member that clicked button has staff role
        if (!member.roles.cache.has(data.staffRole)) {
          await interaction.reply({
            content: "You aren't allowed to use this, sorry.",
            ephemeral: true
          })
          return
        }
        interaction.message.edit({ components: [] })
      }

      else if (interaction.customId.startsWith('change')) {
        await interaction.deferUpdate()
        const parts = interaction.customId.split('@_@')
        const userId = parts[1]
        const nickname = parts[2]
        const playertag = parts[3]
        const whoStartedLink = parts[4]
        //console.log(parts)
        const user = await interaction.guild.members.cache.get(userId)

        const filePath = path.join(
          __dirname,
          '..',
          '..',
          'guildsInfo',
          `${interaction.guild.id}.json`
        )
        let data = {}
        try {
          data = JSON.parse(fs.readFileSync(filePath))
        } catch (err) {
          console.error(err)
        }

        // get member that clicked the button
        const member = await interaction.guild.members.fetch(
          interaction.user.id
        )
        // check that the member that clicked button has staff role
        if (member.roles.cache.has(data.staffRole) && interaction.user.id !== whoStartedLink) {
          await interaction.followUp({
            content: `You didn't try linking this player, let <@${whoStartedLink}> finish please.`,
            ephemeral: true
          })
          return
        }
        if (!member.roles.cache.has(data.staffRole)) {
          await interaction.followUp({
            content: "You aren't allowed to use this, sorry.",
            ephemeral: true
          })
          return
        }

        try {
          // change name
          newConfirm = new ButtonBuilder()
            .setCustomId('confirmed')
            .setLabel('Link changed!')
            .setDisabled(true)
            .setStyle(ButtonStyle.Success)

          const confirmRow = new ActionRowBuilder().addComponents(newConfirm)

          // Add to database
          // setting nickname
          try {
            await user.setNickname(nickname)
          } catch (error) {
            interaction.followUp({ content: "Issue changing name, but link should have went through still.", ephemeral: true });
          }
          await interaction.message.edit({ components: [confirmRow] })

          let oldUserId = data.playersTag[playertag].userId;
          delete data.playersTag[playertag] // delete current player linked
          let index = data.playersId[oldUserId].playertags.indexOf(playertag);
          if (index !== -1) {
            data.playersId[oldUserId].playertags.splice(index, 1);
          }

          data.playersTag[playertag] = { userId: userId }
          if (data.playersId[userId]) {
            // if userId already exists, append playertag to existing array for multiple links
            data.playersId[userId].playertags.push(playertag)
          } else {
            data.playersId[userId] = { playertags: [playertag] };
          }
          fs.writeFileSync(filePath, JSON.stringify(data))
        } catch (error) {
          // error changing or linking
          console.log(error)
          const newError = new ButtonBuilder()
            .setCustomId(
              `change@_@${parts[1]}@_@${parts[2]}@_@${parts[3]}@_@${interaction.user.id}`
            )
            .setLabel('Error changing link, try again')
            //.setDisabled(true)
            .setStyle(ButtonStyle.Danger)

          const errorRow = new ActionRowBuilder().addComponents(newError)

          interaction.message.edit({ components: [errorRow] })
          await interaction.followUp({
            content:
              "There was a problem with linking or changing this user's name. Try again, if it keeps erroring, likely a permission issue.",
            ephemeral: true
          })
        }
      }
    }
  }
}
