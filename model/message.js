const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
    messageId: String,
    sender: String,
    body: String,
    timestamp: Date,
    isSpam: { type: Boolean, default: false },
    reportedBy: [String], // Store user IDs who reported this message
    reportCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  });
  
  const Message = mongoose.model('Message', messageSchema);

  module.exports = Message;