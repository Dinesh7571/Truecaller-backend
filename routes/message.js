const express = require("express");
const {checkSpamSms,reportSms} = require("../controllers/message");
const { authenticateToken } = require("../middleware/user");
const router = express.Router();
const Message = require("../model/message");
router.post("/checkSpamSms", checkSpamSms);
router.post("/reportSpamSms", authenticateToken, reportSms);


module.exports = router;