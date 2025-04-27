const stringSimilarity = require('string-similarity');
const Message = require('../model/message'); 



const checkSpamBySimilarity = (messageBody, knownSpamMessages) => {
  for (const spamMessage of knownSpamMessages) {
    const similarity = stringSimilarity.compareTwoStrings(messageBody.toLowerCase(), spamMessage.toLowerCase());
    if (similarity >= 0.7) { // 70% similarity threshold
      return { isSpam: true, similarity, matchedMessage: spamMessage };
    }
  }
  return { isSpam: false, similarity: 0, matchedMessage: null };
};

const checkSpamSms = async (req, res) => {
  try {
    const messages = req.body.messages; // <-- expect an array now
  
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }
  
    const results = [];
    const knownSpamMessages = ["Free money offer", "Click here to win", "Congratulations, you've won"]; // Example known spam messages

    for (const msg of messages) {
      const { userId, messageBody, sender, timestamp, isReportingAsSpam } = msg;
  
      if (!messageBody) {
        results.push({ success: false, error: 'Message body is required' });
        continue;
      }

      // No need to search by messageId, we are checking the content directly
      let message = new Message({
        sender,
        body: messageBody,
        timestamp: timestamp || new Date(),
        isSpam: false,
        reportedBy: [],
        reportCount: 0
      });
  
      const alreadyReported = message.reportedBy.includes(userId);

      // Check if similarity-based spam detection triggers
      const { isSpam: isSimilarSpam, similarity, matchedMessage } = checkSpamBySimilarity(messageBody, knownSpamMessages);
        
      if (isSimilarSpam) {
        message.isSpam = true;
        results.push({
          success: true,
          currentStatus: {
            isSpam: message.isSpam,
            reportCount: message.reportCount,
          },
          similarity,
          matchedMessage,
        });
      } else {
        if (!alreadyReported && userId) {
          message.reportedBy.push(userId);
          message.reportCount += 1;
  
          if (message.reportCount >= 10 && isReportingAsSpam) {
            message.isSpam = true;
          }
  
          await message.save();
        }
  
        results.push({ 
          success: true, 
          currentStatus: {
            isSpam: message.isSpam,
            reportCount: message.reportCount
          }
        });
      }
    }
  
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error reporting messages:', error);
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
