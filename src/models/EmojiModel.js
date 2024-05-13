const { Schema, model } = require('mongoose');

const emojiSchema = new Schema({
  emojiName: {
    unique: true,
    type: String,
    required: true,
  },
  emojiId: {
    type: String,
    required: true
  }
});


module.exports = model('Emoji', emojiSchema);