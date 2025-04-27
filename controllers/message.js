const stringSimilarity = require('string-similarity');
const Message = require('../model/message'); 

const checkSpamByAddress = (senderAddress, knownSpamSenders) => {
  let isSpam = false;
  let matchedSender = '';

  if (knownSpamSenders.includes(senderAddress.toLowerCase())) {
    isSpam = true;
    matchedSender = senderAddress;
  }

  return { isSpam, matchedSender };
};

const checkSpamSms = async (req, res) => {
  try {
    const messages = req.body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required' });
    }

    const results = [];

    // Fetch known spam addresses from database
    const knownSpamAddresses = await Message.find({ isSpam: true }).distinct('sender');

    for (const msg of messages) {
      const { messageId, sender, timestamp } = msg;

      if (!sender) {
        results.push({ success: false, error: 'Sender address is required' });
        continue;
      }

      // Check if sender matches a known spam address
      const { isSpam, matchedSender } = checkSpamByAddress(sender, knownSpamAddresses);

      results.push({
        messageId,
        sender,
        success: true,
        isSpam,
        matchedSender: isSpam ? matchedSender : 'No matching spam sender found',
      });
    }

    res.json({ success: true, results });

  } catch (error) {
    console.error('Error checking addresses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const reportSms = async (req, res) => {
  try {
    const { messageId, userId, messageBody, sender, timestamp, isReportingAsSpam } = req.body;

    if (!messageId || !sender) {
      return res.status(400).json({ success: false, message: 'Message ID and sender are required' });
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
