const mongoose = require("mongoose");

const verificationCodeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["login", "signup"],
    default: "login",
  },
  name: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
  },
});

verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("VerificationCode", verificationCodeSchema);
