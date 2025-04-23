const jwt = require("jsonwebtoken");
const User = require("../model/user");
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;

// Generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, {
    expiresIn: "5d",
  });
  const refreshToken = jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

// Login
const login = async (req, res) => {
  const { phoneNumber } = req.body;
  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(200).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Sign up
const signUp = async (req, res) => {
  const { name, phoneNumber, email } = req.body;
  try {
    let user = await User.findOne({ phoneNumber });
    if (user) return res.status(400).json({ message: "User already exists" });

    user = new User({ name, phoneNumber, email });
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
};



//get accurate name 
const getWordMatchScore = (nameA, nameB) => {
  const wordsA = nameA.toLowerCase().split(/\s+/); // Split by spaces
  const wordsB = nameB.toLowerCase().split(/\s+/);
  let score = 0;

  // Check each word against every other word in the other name
  for (const wordA of wordsA) {
    for (const wordB of wordsB) {
      let matchLength = 0;
      for (let i = 0; i < Math.min(wordA.length, wordB.length); i++) {
        if (wordA[i] === wordB[i]) {
          matchLength++;
        } else {
          break;
        }
      }
      score += matchLength; // Add the match length to the score
    }
  }
  return score;
};

// Function to get the most similar names for a user
const getMostSimilarName = (possibleNames) => {
  if (!Array.isArray(possibleNames) || possibleNames.length === 0) return null;

  const scores = {};

  // Calculate score for each name against all others
  for (let i = 0; i < possibleNames.length; i++) {
    const nameA = possibleNames[i];
    scores[nameA] = 0;

    for (let j = 0; j < possibleNames.length; j++) {
      if (i === j) continue;
      const nameB = possibleNames[j];
      scores[nameA] += getWordMatchScore(nameA, nameB);
    }
  }

  // Find the maximum score to scale the accuracy to a percentage
  const maxScore = Math.max(...Object.values(scores));

  // Convert the raw scores to a percentage (0 to 100)
  const accuracyPercentages = Object.entries(scores).map(([name, score]) => {
    const percentage = (score / maxScore) * 100; // Scale to 100
    return { name, accuracy: Math.round(percentage * 10) / 10 }; // Round to 1 decimal place
  });

  // Sort by accuracy percentage, highest first
  accuracyPercentages.sort((a, b) => b.accuracy - a.accuracy);

  return accuracyPercentages;
};

// Fetch user by phone number
const getUserByPhoneNumber = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    // Fetch user by phone number
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the possible names array, if empty use the user's name
    const possibleNames = user.possibleNames.length > 0 ? user.possibleNames : [user.name];

    // Get the most similar names
    const mostSimilarNames = getMostSimilarName(possibleNames);

    // Return the sorted names with accuracy percentages
    return res.json({
      message: "Names sorted by accuracy percentage",
      data: mostSimilarNames
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};




// Report fraud
const reportFraud = async (req, res) => {
  const { phoneNumber } = req.params;
  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.fraudCount += 1;
    user.checkSpamStatus();
    await user.save();

    res.status(200).json(user);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: err.message });
  }
};

const addMultipleUsers = async (req, res) => {
  try {
    const usersData = req.body.users; // [{ name: "", phoneNumber: "" }, ...]

    if (!Array.isArray(usersData)) {
      return res.status(400).json({ error: "Expected users array" });
    }

    const phoneNumbers = usersData.map((u) => u.phoneNumber);
    const existingUsers = await User.find({ phoneNumber: { $in: phoneNumbers } });

    // Map of existing users for faster lookup
    const existingMap = {};
    existingUsers.forEach((user) => {
      existingMap[user.phoneNumber] = user;
    });

    const bulkOps = [];

    for (const incoming of usersData) {
      const { phoneNumber, name } = incoming;

      // If user exists
      if (existingMap[phoneNumber]) {
        const user = existingMap[phoneNumber];

        // Avoid duplicate names in possibleNames
        if (name && !user.possibleNames.includes(name)) {
          bulkOps.push({
            updateOne: {
              filter: { phoneNumber },
              update: { $addToSet: { possibleNames: name } }, // $addToSet avoids duplicates
            },
          });
        }
      } else {
        // New user
        const newUser = {
          phoneNumber,
          possibleNames: name ? [name] : [],
        };

        bulkOps.push({
          updateOne: {
            filter: { phoneNumber },
            update: { $set: newUser },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length === 0) {
      return res.status(200).json({ message: "No new users or name suggestions to update." });
    }

    const result = await User.bulkWrite(bulkOps);
    return res.status(201).json({ message: "Users updated successfully", result });
  } catch (error) {
    return res.status(500).json({ error: "Server error", details: error.message });
  }
};

module.exports = {
  getUserByPhoneNumber,
  reportFraud,
  login,
  signUp,
  addMultipleUsers,
};
