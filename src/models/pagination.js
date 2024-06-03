const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, } = require("discord.js");

// https://www.youtube.com/watch?v=sDfjMzEnSZQ
async function buttonPages(interaction, pages, type, time = 90000){

  // errors
console.log(type);

  //if (!interaction) throw new Error("Please provide an interaction argument");
  if (!pages) throw new Error("Please provide a page argument");
  if (!Array.isArray(pages)) throw new Error("Pages must be an array");

  if (typeof time !== "number") throw new Error("Time must be a number.");
  if (parseInt(time) < 30000) throw new Error("Time must be greater than 30 seconds");


  // defer
  //await interaction.deferReply();

  // no buttons if only one page
  if (pages.length === 1){
    const page = await interaction.editReply({
      embeds: pages,
      components: [],
      fetchReply: true,
    });
    return page;
  }


  if (type === "players"){
    console.log("Entered player pagination");
    const players = new ButtonBuilder()
  }

}