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
    const usersData = req.body.users; // Expecting an array of user objects in the request body

    if (!Array.isArray(usersData)) {
      return res
        .status(400)
        .json({ error: "Invalid input format. Expected an array of users." });
    }

    // Extract phone numbers and prepare bulk operations
    const phoneNumbers = usersData.map((user) => user.phoneNumber);
    const existingUsers = await User.find({
      phoneNumber: { $in: phoneNumbers },
    }).select("phoneNumber");
    const existingPhoneNumbers = new Set(
      existingUsers.map((user) => user.phoneNumber)
    );

    // Prepare bulk operations for new users
    const operations = usersData
      .filter((user) => !existingPhoneNumbers.has(user.phoneNumber))
      .map((user) => ({
        updateOne: {
          filter: { phoneNumber: user.phoneNumber },
          update: { $set: user },
          upsert: true,
        },
      }));

    if (operations.length === 0) {
      return res
        .status(200)
        .json({ message: "All users already exist in the database." });
    }

    // Execute bulk operations
    const result = await User.bulkWrite(operations);

    // Return success message
    return res
      .status(201)
      .json({ message: "New users added successfully", result });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error adding users", details: error.message });
  }
};

module.exports = {
  getUserByPhoneNumber,
  reportFraud,
  login,
  signUp,
  addMultipleUsers,
};
