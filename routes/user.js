const express = require("express");
const { authenticateToken } = require("../middleware/user");
const {
  getUserByPhoneNumber,
  addMultipleUsers,
  login,
  signUp,
  reportFraud,
} = require("../controllers/user");
const router = express.Router();

router.get("/:phoneNumber", authenticateToken, getUserByPhoneNumber);
router.put("/report/:phoneNumber", authenticateToken, reportFraud);
router.post("/add-multiple", authenticateToken, addMultipleUsers);
router.post("/login", login);
router.post("/signup", signUp);

module.exports = router;
