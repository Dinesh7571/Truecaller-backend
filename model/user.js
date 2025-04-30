const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  countryCode: { type: String, required: true },
  isSpam: { type: Boolean, default: false },
  fraudCount: { type: Number, default: 0 },
  email: { type: String },
  name: { type: String }, 
  possibleNames: [{ type: String }] ,
  deviceToken: { type: String },

});

// Auto-mark as spam based on fraud count
UserSchema.methods.checkSpamStatus = function () {
  if (this.fraudCount >= 10) {
    this.isSpam = true;
  }
};

// Ensure phoneNumber is indexed
UserSchema.index({ phoneNumber: 1 });

const User = mongoose.model("User", UserSchema);
module.exports = User;
