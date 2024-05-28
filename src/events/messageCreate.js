const { Events } = require('discord.js');
const fs = require('fs');
//const API = require("../../API.js");
const path = require('path');
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const filePath = path.join(__dirname,'..','..','guildsInfo',`${message.guild.id}.json`)
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
    }

    let member = message.author;

    for (let roleId in data.pingableRoles){
      if (message.mentions.roles.some(role => role.id === roleId)){
        console.log(roleId);
        console.log("role was pinged");
        // Check if the player already exists in playersId
        console.log(!data.playersId[member.id])
        if (!data.playersId[member.id]) {
          data.playersId[member.id] = {};
        }
        // Add the field to the player with the key being the roleId
        data.playersId[member.id][data.pingableRoles[roleId].description] = true;
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data));
    // // Check if the message mentions the "attackinglate" role
    // if (message.mentions.roles.some(role => role.id === '1020930468566278144')) {
    //   // The role was mentioned
    //   let query = {
    //     userId: member.id,
    //     guildId: message.guild.id,
    //   }
    //   let findUser = await UserPinged.findOne(query);
    //   if (!findUser){
    //     let user = new UserPinged({
    //       userId: member.id,
    //       guildId: message.guild.id,
    //       mentionedRole: "⏰",
    //       roleId: "1020930468566278144"
    //     })
    //     await user.save();
    //     const thumbsUp = '👍';
    //     message.react(thumbsUp)
    //     console.log("New user and set mentioned role to attacklate");
    //   }
    //   else {
    //     findUser.mentionedRole = "⏰";
    //     findUser.roleId = "1020930468566278144"
    //     await findUser.save();
    //     const thumbsUp = '👍';
    //     message.react(thumbsUp);
    //     console.log("Found user and set mentioned role to attackinglate");
    //   }
      
    // }

    // // replace
    // else if(message.mentions.roles.some(role => role.id === '1201147623315353673')){
    //     // The role was mentioned
    //     let query = {
    //       userId: member.id,
    //       guildId: message.guild.id,
    //     }
    //     let findUser = await UserPinged.findOne(query);
    //     if (!findUser){
    //       let user = new UserPinged({
    //         userId: member.id,
    //         guildId: message.guild.id,
    //         mentionedRole: "↔️",
    //         roleId: "1201147623315353673"
    //       })
    //       await user.save();
    //       const thumbsUp = '👍';
    //       message.react(thumbsUp)
    //       console.log("New user and set mentioned role to attacklate");
    //     }
    //     else {
    //       findUser.mentionedRole = "↔️";
    //       findUser.roleId = "1201147623315353673";
    //       await findUser.save();
    //       const thumbsUp = '👍';
    //       message.react(thumbsUp)
    //       console.log("Found user and set mentioned role to replaceme");
    //     }
    // }
    // else {
    //   // The role was not mentioned
    //   console.log('The role "replaceme" was not mentioned.');
  
    // }
  }
};
