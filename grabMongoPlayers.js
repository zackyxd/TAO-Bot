const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
//const User = require(`src/models/02UserModel.js`);

// Connection URL
const url = 'mongodb+srv://zackyxd:7DgJZiQACz2@cr-discord-bot.gglyszd.mongodb.net/?retryWrites=true&w=majority&appName=cr-discord-bot';

// Database Name
const dbName = 'test';

// Create a new MongoClient
const client = new MongoClient(url);

async function run() {
  try {

    const filePath = path.join(__dirname, 'guildInfo', `722956243261456536.json`);
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
    }
    console.log(data);
    // Connect the client to the server
    await client.connect();

    // Establish and verify connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected successfully to server");

    // Get the database
    const db = client.db(dbName);
    
    // Get all documents in the Users collection that match the guild ID
    const guildId = '722956243261456536';
    const users = await db.collection('users').find().toArray();
    console.log("here");
    console.log(users);
    // Initialize an empty object to store the user ID and player data pairs
    let players = {};

    // Iterate over each user
    for (const user of users) {
      // Add the user to the players dictionary
      data.players[user.playertag] = { userId: user.userId };
    }

    // Save the players object to your JSON file
    fs.writeFileSync(filePath, JSON.stringify(data));

  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);
