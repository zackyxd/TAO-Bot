require('dotenv/config');

const { AttachmentBuilder, EmbedBuilder } = require("discord.js");

const key = process.env.CR_KEY;
const fs = require("fs");
const axios = require("axios");

async function fetchData(url, filename, print) {
  try {
    const response = await axios(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = response.data;
    // Data to string
    const dataString = JSON.stringify(data, null, 2);
    // Check if data exists
    if (data && print === true) {
      // Write the data to a file
      fs.writeFile(`JSON_Data/${filename}.json`, dataString, (err) => {
        if (err) {
          console.error(`Error writing ${filename}.json`, err);
        } else {
          console.log(`Wrote to ${filename}.json`);
        }
      });
    }
    return data;

  } catch (error) {
    //console.log(`Fetch failed: ${error}`);
    return null;
  }
}



module.exports = {
  fetchData,
  //checkStatus,
};