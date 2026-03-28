const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true, index: true },
    isActive:     { type: Boolean, default: true },
    otpCode:      { type: String, default: null },
    otpExpiresAt: { type: Date,   default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);
