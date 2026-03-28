const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Otp', OtpSchema);
