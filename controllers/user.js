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


// Fetch user by phone number
const getUserByPhoneNumber = async (req, res) => {
  const { phoneNumber } = req.params;
  try {
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
