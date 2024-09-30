const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  isSpam: { type: Boolean, default: false },
  fraudCount: { type: Number, default: 0 },
  email:{type:String}
});

UserSchema.methods.checkSpamStatus = function () {
  if (this.fraudCount >= 10) {
    this.isSpam = true;
  }
};

const User = mongoose.model("User", UserSchema);

UserSchema.index({ phoneNumber: 1 });


module.exports = User;
