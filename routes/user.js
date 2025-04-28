const express = require("express");
const { authenticateToken } = require("../middleware/user");
const {
  getUserByPhoneNumber,
  addMultipleUsers,
  login,
  signUp,
  reportFraud,
  allSpamUsersByCountryCode,
} = require("../controllers/user");
const router = express.Router();

router.get("/:phoneNumber", authenticateToken, getUserByPhoneNumber);
router.put("/report/:phoneNumber", authenticateToken, reportFraud);
router.post("/add-multiple", authenticateToken, addMultipleUsers);
router.get("/all-spam/:countryCode",  allSpamUsersByCountryCode);
router.get('/test',  (req, res) => {
  res.status(200).json({ message: "Test route is working" });
});
router.post("/login", login);
router.post("/signup", signUp);

module.exports = router;
