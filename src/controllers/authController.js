const crypto = require('crypto');
const { z } = require('zod');

const Admin = require('../models/Admin');
const { sendMail } = require('../utils/mailer');
const { otpEmail } = require('../utils/emailTemplates');
const { signCmsToken } = require('../utils/jwt');

const requestOtpSchema = z.object({
  email: z.string().email()
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

function generateOtp() {
  // Cryptographically secure 6-digit OTP
  return String(crypto.randomInt(100000, 1000000));
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function requestOtp(req, res, next) {
  try {
    const { email } = requestOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      return res.status(404).json({ error: 'No account found for this email address.' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ error: 'This account has been disabled. Contact an administrator.' });
    }

    const otp = generateOtp();
    admin.otpCode      = otp;
    admin.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await admin.save();

    await sendMail({
      to: email,
      subject: 'Your Vedah Vital Admin Login Code',
      html: otpEmail({ otp }),
      text: `Your one-time login code is: ${otp}\n\nThis code is valid for 5 minutes. Do not share it with anyone.`
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const normalizedEmail = email.toLowerCase();

    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin || !admin.otpCode || !admin.otpExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    if (admin.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (String(otp) !== admin.otpCode) {
      return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
    }

    // Consume OTP
    admin.otpCode      = null;
    admin.otpExpiresAt = null;
    await admin.save();

    if (!admin.isActive) {
      return res.status(403).json({ error: 'Admin access not allowed.' });
    }

    const token = signCmsToken({
      sub:   admin._id.toString(),
      email: admin.email,
      role:  'admin'
    });

    return res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestOtp, verifyOtp };
