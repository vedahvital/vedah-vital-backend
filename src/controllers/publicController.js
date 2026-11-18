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
    const submission = await ContactSubmission.create({ name, email, message });

    const supportEmail = process.env.SUPPORT_EMAIL;
    if (supportEmail) {
      try {
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
      } catch (mailErr) {
        console.warn('Contact email delivery warning:', mailErr.message);
      }
    }

    res.json({ ok: true, success: true, submissionId: submission._id });
  } catch (err) {
    next(err);
  }
}

async function verifyQr(req, res) {
  const rawCode = String(req.params.code || '').trim();
  if (!rawCode) {
    return res.status(400).json({
      status: 'INVALID',
      verified: false,
      error: 'Missing code'
    });
  }

  // Case-insensitive lookup (exact or case-insensitive regex)
  const escapedCode = rawCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const qr = await QrCode.findOne({
    $or: [
      { code: rawCode },
      { code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } }
    ]
  });

  if (!qr) {
    return res.status(404).json({
      status: 'NOT_FOUND',
      verified: false,
      code: rawCode,
      message: "We could not verify this product's identification code. Please contact VEDAH VITAL customer support before using the product."
    });
  }

  const now = new Date();

  // Scenario B: Code already scanned
  if (qr.used) {
    const firstVerifiedAt = qr.usedAt || qr.updatedAt || qr.createdAt;
    qr.scanCount = (qr.scanCount || 1) + 1;
    qr.lastScannedAt = now;
    await qr.save();

    return res.json({
      status: 'ALREADY_SCANNED',
      verified: false,
      code: qr.code,
      firstVerificationDate: firstVerifiedAt,
      currentScanDate: now,
      scanCount: qr.scanCount,
      product: {
        name: qr.product?.name || 'KSM-66® Ashwagandha Root Extract',
        brand: qr.product?.brand || 'VEDAH VITAL',
        strength: qr.product?.strength || '500 mg',
        blackPepperExtract: qr.product?.blackPepperExtract || '5 mg',
        packSize: qr.product?.packSize || '60 Vegan Capsules',
        batchNumber: qr.product?.batchNo || qr.code,
        mfgDate: qr.product?.mfgDate || '—',
        expDate: qr.product?.expDate || '—'
      },
      labReports: qr.labReports || { potency: [], heavyMetals: [], microbial: [] },
      message: "This product's QR code has previously been scanned."
    });
  }

  // Scenario A: Genuine product (First verification)
  qr.used = true;
  qr.usedAt = now;
  qr.scanCount = 1;
  qr.lastScannedAt = now;
  await qr.save();

  return res.json({
    status: 'GENUINE',
    verified: true,
    code: qr.code,
    verificationDate: now,
    product: {
      name: qr.product?.name || 'KSM-66® Ashwagandha Root Extract',
      brand: qr.product?.brand || 'VEDAH VITAL',
      strength: qr.product?.strength || '500 mg',
      blackPepperExtract: qr.product?.blackPepperExtract || '5 mg',
      packSize: qr.product?.packSize || '60 Vegan Capsules',
      batchNumber: qr.product?.batchNo || qr.code,
      mfgDate: qr.product?.mfgDate || '—',
      expDate: qr.product?.expDate || '—'
    },
    labReports: qr.labReports || { potency: [], heavyMetals: [], microbial: [] },
    message: 'Your product has been successfully verified.'
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

    let code = String(decoded || '').trim();
    if (!code) {
      return res.status(400).json({
        status: 'INVALID',
        verified: false,
        error: 'Could not decode QR code from image'
      });
    }

    // If QR contains full URL (e.g. https://vedahvital.com/verify?batch=VV-XXX&source=qr), extract batch code
    try {
      if (code.includes('?')) {
        const urlObj = new URL(code, 'https://vedahvital.com');
        const batchParam = urlObj.searchParams.get('batch');
        if (batchParam) {
          code = batchParam.trim();
        }
      }
    } catch {
      // not a valid URL, treat as raw code
    }

    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const qrDoc = await QrCode.findOne({
      $or: [
        { code },
        { code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } }
      ]
    });
    if (!qrDoc) {
      return res.status(404).json({
        status: 'NOT_FOUND',
        verified: false,
        code,
        message: "We could not verify this product's identification code. Please contact VEDAH VITAL customer support before using the product."
      });
    }

    const now = new Date();

    if (qrDoc.used) {
      const firstVerifiedAt = qrDoc.usedAt || qrDoc.updatedAt || qrDoc.createdAt;
      qrDoc.scanCount = (qrDoc.scanCount || 1) + 1;
      qrDoc.lastScannedAt = now;
      await qrDoc.save();

      return res.json({
        status: 'ALREADY_SCANNED',
        verified: false,
        code: qrDoc.code,
        firstVerificationDate: firstVerifiedAt,
        currentScanDate: now,
        scanCount: qrDoc.scanCount,
        product: {
          name: qrDoc.product?.name || 'KSM-66® Ashwagandha Root Extract',
          brand: qrDoc.product?.brand || 'VEDAH VITAL',
          strength: qrDoc.product?.strength || '500 mg',
          blackPepperExtract: qrDoc.product?.blackPepperExtract || '5 mg',
          packSize: qrDoc.product?.packSize || '60 Vegan Capsules',
          batchNumber: qrDoc.product?.batchNo || qrDoc.code,
          mfgDate: qrDoc.product?.mfgDate || '—',
          expDate: qrDoc.product?.expDate || '—'
        },
        labReports: qrDoc.labReports || { potency: [], heavyMetals: [], microbial: [] },
        message: "This product's QR code has previously been scanned."
      });
    }

    qrDoc.used = true;
    qrDoc.usedAt = now;
    qrDoc.scanCount = 1;
    qrDoc.lastScannedAt = now;
    await qrDoc.save();

    return res.json({
      status: 'GENUINE',
      verified: true,
      code: qrDoc.code,
      verificationDate: now,
      product: {
        name: qrDoc.product?.name || 'KSM-66® Ashwagandha Root Extract',
        brand: qrDoc.product?.brand || 'VEDAH VITAL',
        strength: qrDoc.product?.strength || '500 mg',
        blackPepperExtract: qrDoc.product?.blackPepperExtract || '5 mg',
        packSize: qrDoc.product?.packSize || '60 Vegan Capsules',
        batchNumber: qrDoc.product?.batchNo || qrDoc.code,
        mfgDate: qrDoc.product?.mfgDate || '—',
        expDate: qrDoc.product?.expDate || '—'
      },
      labReports: qrDoc.labReports || { potency: [], heavyMetals: [], microbial: [] },
      message: 'Your product has been successfully verified.'
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
