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

    const filePath = path.join(__dirname, 'guildsInfo', `722956243261456536.json`);
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    }
    catch (err){
      console.error(err);
    }
    //console.log(data);
    // Connect the client to the server
    await client.connect();

    // Establish and verify connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected successfully to server");

    // Get the database
    const db = client.db(dbName);
    
    // Get all documents in the Users collection
    const users = await db.collection('users').find().toArray();

    // Iterate over each user
    for (const user of users) {
      // Add the user to the playersTag dictionary
      data.playersTag[user.playertag] = { userId: user.userId };

      // Check if the userId already exists in playersId
      if (!data.playersId[user.userId]) {
        // If not, initialize an empty array for playertags
        data.playersId[user.userId] = { playertags: [] };
      }
      // Add the playertag to the user's array of playertags
      data.playersId[user.userId].playertags.push(user.playertag);
    }

    // Save the updated data object to your JSON file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);