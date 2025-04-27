const express = require("express");
const {checkSpamSms,reportSms} = require("../controllers/message");
const { authenticateToken } = require("../middleware/user");
const router = express.Router();
const Message = require("../model/message");
router.post("/checkSpamSms", checkSpamSms);
router.post("/reportSpamSms", authenticateToken, reportSms);

router.get("/allSpamSms", async (req, res) => {
    const message = await Message.find({ isSpam: true });
    if (!message) {
        return res.status(404).json({ success: false, message: "No spam messages found" });
    }
    res.json({ success: true, message });
   
})
module.exports = router;