const { z } = require('zod');
const Jimp = require('jimp');
const QrCodeReader = require('qrcode-reader');

const QrCode = require('../models/QrCode');
const Subscriber = require('../models/Subscriber');
const ContactSubmission = require('../models/ContactSubmission');
const { sendMail } = require('../utils/mailer');
const { contactNotificationToSupport, contactConfirmationToUser } = require('../utils/emailTemplates');

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1)
});

async function contact(req, res, next) {
  try {
    const { name, email, message } = contactSchema.parse(req.body);

    // Save submission to database for CMS tracking
    await ContactSubmission.create({ name, email, message });

    const supportEmail = process.env.SUPPORT_EMAIL;
    if (!supportEmail) {
      return res.status(500).json({ error: 'Missing SUPPORT_EMAIL' });
    }

    // Notify support team
    await sendMail({
      to: supportEmail,
      subject: `New Contact Message from ${name}`,
      html: contactNotificationToSupport({ name, email, message }),
      text: `From: ${name} <${email}>\n\n${message}`
    });

    // Confirmation to the user
    await sendMail({
      to: email,
      subject: 'We received your message — Vedah Vital',
      html: contactConfirmationToUser({ name, message }),
      text: `Hi ${name},\n\nThanks for reaching out! We've received your message and will get back to you shortly.\n\nYour message:\n${message}\n\n— The Vedah Vital Team`
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function verifyQr(req, res) {
  const code = String(req.params.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const qr = await QrCode.findOne({ code });
  if (!qr) {
    return res.status(404).json({ error: 'Invalid QR code' });
  }

  if (qr.used) {
    return res.status(409).json({ error: 'This QR code has already been used.' });
  }

  qr.used = true;
  qr.usedAt = new Date();
  await qr.save();

  res.json({
    code: qr.code,
    used: qr.used,
    usedAt: qr.usedAt,
    product: qr.product,
    createdAt: qr.createdAt
  });
}

async function verifyQrImage(req, res) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Missing image file' });
  }

  try {
    const image = await Jimp.read(file.buffer);

    const decoded = await new Promise((resolve, reject) => {
      const qr = new QrCodeReader();
      qr.callback = function (err, value) {
        if (err) return reject(err);
        resolve(value && (value.result || value));
      };
      try {
        qr.decode(image.bitmap);
      } catch (e) {
        reject(e);
      }
    });

    const code = String(decoded || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Could not decode QR code from image' });
    }

    const qrDoc = await QrCode.findOne({ code });
    if (!qrDoc) return res.status(404).json({ error: 'Invalid QR code' });

    if (qrDoc.used) {
      return res.status(409).json({ error: 'This QR code has already been used.' });
    }

    qrDoc.used = true;
    qrDoc.usedAt = new Date();
    await qrDoc.save();

    return res.json({
      code: qrDoc.code,
      used: qrDoc.used,
      usedAt: qrDoc.usedAt,
      product: qrDoc.product,
      createdAt: qrDoc.createdAt
    });
  } catch (err) {
    console.error('QR decode error', err);
    return res.status(500).json({ error: err.message || 'Failed to decode image' });
  }
}

async function subscribe(req, res, next) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const normalizedEmail = email.trim().toLowerCase();

    let subscriber = await Subscriber.findOne({ email: normalizedEmail });
    if (!subscriber) {
      subscriber = await Subscriber.create({ email: normalizedEmail });
    }

    return res.json({ success: true, message: 'Subscribed to promotional updates!' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    next(err);
  }
}

module.exports = { contact, verifyQr, verifyQrImage, subscribe };
