const stringSimilarity = require('string-similarity');
const Message = require('../model/message'); 

// Helper function to check similarity with known spam messages
const checkSpamBySimilarity = (messageBody, knownSpamMessages) => {
  let isSpam = false;
  let highestSimilarity = 0;
  let matchedMessage = '';

  // Compare the message with each known spam message using some similarity algorithm (e.g., cosine similarity, Jaccard index, etc.)
  for (const spamMessage of knownSpamMessages) {
    const similarity = calculateSimilarity(messageBody, spamMessage);

    if (similarity >= highestSimilarity) {
      highestSimilarity = similarity;
      matchedMessage = spamMessage;
    }
  }

  if (highestSimilarity >= 0.80) {
    isSpam = true;
  }

  return { isSpam, similarity: highestSimilarity, matchedMessage };
};


const calculateSimilarity = (messageBody, knownMessage) => {
  const messageWords = messageBody.toLowerCase().split(' ');
  const knownWords = knownMessage.toLowerCase().split(' ');

  // Calculate Jaccard similarity (for simplicity, this can be improved)
  const intersection = messageWords.filter(word => knownWords.includes(word)).length;
  const union = new Set([...messageWords, ...knownWords]).size;

  return intersection / union;
};

const checkSpamSms = async (req, res) => {
  try {
    const messages = req.body.messages; // <-- Expect an array of messages from user's phone

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    const results = [];

    // Known spam messages from the database (you can replace this with a dynamic database fetch if required)
    const knownSpamMessages = await messages.find({
      isSpam: true,
    }).then(messages => messages.map(msg => msg.body)); // Fetch known spam messages from your database
 // Fetch known spam messages from your database
   // Fetch known spam messages from your database

    for (const msg of messages) {
      const { messageBody, sender, userId, timestamp, isReportingAsSpam } = msg;

      if (!messageBody) {
        results.push({ success: false, error: 'Message body is required' });
        continue;
      }

      // Check similarity with known spam messages
      const { isSpam, similarity, matchedMessage } = checkSpamBySimilarity(messageBody, knownSpamMessages);

      if (isSpam && similarity >= 0.80) {
        // If similarity is greater than 80%, mark it as spam
        results.push({
          messageBody,
          sender,
          success: true,
          isSpam: true,
          similarity,
          matchedMessage,
        });
      } else {
        results.push({
          messageBody,
          sender,
          success: true,
          isSpam: false,
          similarity,
          matchedMessage: 'No matching spam message found',
        });
      }
    }

    // Send response back with results
    res.json({ success: true, results });

  } catch (error) {
    console.error('Error checking messages:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

 const reportSms= async (req, res) => {
    try {
      const { messageId, userId, messageBody, sender, timestamp, isReportingAsSpam } = req.body;
      
      if (!messageId || !messageBody) {
        return res.status(400).json({ success: false, message: 'Message ID and body are required' });
      }
  
      // Find if message already exists in database
      let message = await Message.findOne({ messageId });
      
      // If message doesn't exist, create it
      if (!message) {
        message = new Message({
          messageId,
          sender,
          body: messageBody,
          timestamp: timestamp || new Date(),
          isSpam: false,
          reportedBy: [],
          reportCount: 0
        });
      }
  
      // Check if this user already reported this message
      const alreadyReported = message.reportedBy.includes(userId);
      
      if (!alreadyReported && userId) {
        // Add user to reporters list
        message.reportedBy.push(userId);
        message.reportCount += 1;
        
        // If report count reaches 10, mark as spam
        if (message.reportCount >= 10 && isReportingAsSpam) {
          message.isSpam = true;
        }
        
        await message.save();
      }
  
      res.json({ 
        success: true, 
        message: 'Report processed successfully',
        currentStatus: {
          isSpam: message.isSpam,
          reportCount: message.reportCount
        }
      });
    } catch (error) {
      console.error('Error reporting message:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  };

  module.exports = {
    checkSpamSms,
    reportSms
  };
