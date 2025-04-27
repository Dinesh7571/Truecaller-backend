const stringSimilarity = require('string-similarity');
const Message = require('../model/message'); 
function checkSpamBySimilarity(messageBody, knownSpamMessages) {
    for (const spamMessage of knownSpamMessages) {
      const similarity = stringSimilarity.compareTwoStrings(messageBody.toLowerCase(), spamMessage.toLowerCase());
      if (similarity >= 0.7) { // 70% similarity threshold
        return { isSpam: true, similarity, matchedMessage: spamMessage };
      }
    }
    return { isSpam: false, similarity: 0 };
  }

  const checkSpamSms = async (req, res) => {
    try {
      const messages = req.body.messages; // <-- expect an array now
  
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, message: 'Messages array is required' });
      }
  
      const results = [];
  
      for (const msg of messages) {
        const { messageId, userId, messageBody, sender, timestamp, isReportingAsSpam } = msg;
  
        if (!messageId || !messageBody) {
          results.push({ messageId, success: false, error: 'Message ID and body are required' });
          continue;
        }
  
        let message = await Message.findOne({ messageId });
  
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
  
        const alreadyReported = message.reportedBy.includes(userId);
  
        if (!alreadyReported && userId) {
          message.reportedBy.push(userId);
          message.reportCount += 1;
  
          if (message.reportCount >= 10 && isReportingAsSpam) {
            message.isSpam = true;
          }
  
          await message.save();
        }
  
        results.push({ 
          messageId, 
          success: true, 
          currentStatus: {
            isSpam: message.isSpam,
            reportCount: message.reportCount
          }
        });
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
