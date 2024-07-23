// const API = require('../../API.js')
// const path = require('path')
// const fs = require('fs')
// const {
//   EmbedBuilder,
//   AttachmentBuilder,
//   SlashCommandBuilder,
//   PermissionFlagsBits
// } = require('discord.js')

// module.exports = {
//   data: new SlashCommandBuilder()
//     .setName('changeroles')
//     .setDescription(
//       'Change roles of necessary players, do not use if you see this.'
//     )
//     .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

//   async execute(interaction) {
//     if (!interaction.isChatInputCommand()) return

//     if (interaction.commandName === 'changeroles') {
//       await interaction.deferReply({ ephemeral: true })
//       let guild = interaction.guild
//       console.log(guild.id)
//       let acRole = '891452315100409898'
//       let acl2wRole = '1138989851631423538'
//       let afhRole = '1026642626943926312'
//       let afhl2wRole = '1227750844179415060'

//       const filePath = path.join(
//         __dirname,
//         '..',
//         '..',
//         '..',
//         'guildsInfo',
//         `${guild.id}.json`
//       )
//       let data = {}
//       try {
//         data = JSON.parse(fs.readFileSync(filePath))
//       } catch (err) {
//         console.error(err)
//         return
//       }

//       const members = await guild.members.fetch()
//       let currentUserNumber = 1
//       let failedMembers = []
//       let removeRoles = 0
//       // members.each(async (member) => {
//       for (const member of members.values()) {
//         console.log(`Checking player ${currentUserNumber} out of ${members.size}`)
//         try {
//           let hadRole = false
//           if (member.roles.cache.has(afhl2wRole)) {
//             await member.roles.remove(afhl2wRole);
//             hadRole = true
//           }
//           if (member.roles.cache.has(afhRole)) {
//             await member.roles.remove(afhRole);
//             hadRole = true
//           }
//           if (member.roles.cache.has(acRole)) {
//             await member.roles.remove(acRole);
//             hadRole = true
//           }
//           if (hadRole && !member.roles.cache.has(acl2wRole)) {
//             await member.roles.add(acl2wRole);
//             removeRoles++
//           }
//           currentUserNumber++
//           await new Promise(resolve => setTimeout(resolve, 200))
//         } catch (error) {
//           currentUserNumber++;
//           failedMembers.push(member.user.username)
//         }
//       }

//       console.log("\nFinished removing all roles and changing them to L2W, now adding AC Roster roles");

//       let text = fs.readFileSync('./memberRoleChanges.txt', 'utf-8')
//       let textByLine = text.split('\r\n')
//       // console.log(textByLine)

//       let reply = ''
//       let addedRole = 0
//       let pingPlayers = ''
//       for (let line of textByLine) {
//         if (line.charAt(0) !== '#') {
//           line = '#' + line
//         }

//         if (!data.playersTag[line]) {
//           reply += `Couldn't find player with tag of: ${line}\n`
//         }

//         if (data.playersTag[line]) {
//           const member = await interaction.guild.members.fetch(
//             data.playersTag[line].userId
//           )
//           console.log(member + `#${addedRole}`);
//           await member.roles.remove(acl2wRole);
//           await member.roles.add(acRole);
//           addedRole++
//           pingPlayers += `<@${data.playersTag[line].userId}> `
//         }
//         await new Promise(resolve => setTimeout(resolve, 150))
//       }

//       reply += `Removed and added ACL2W role to ${removeRoles} players\nAdded AC role to ${addedRole} players\n`
//       if (failedMembers.length > 0) {
//         reply += `The roles have been modified for all users. However, the operation failed for the following members: ${failedMembers.join(
//           ', '
//         )}\n`
//       } else {
//         reply += `The roles have been modified for all users.\n`
//       }
//       reply += pingPlayers

//       await interaction.editReply(reply)
//     }
//   }
// }
