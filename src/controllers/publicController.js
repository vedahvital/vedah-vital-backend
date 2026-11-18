const crypto = require('crypto');
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
  let rawCode = String(req.params.code || '').trim();
  if (!rawCode) {
    return res.status(400).json({
      status: 'INVALID',
      verified: false,
      error: 'Missing code'
    });
  }

  // If query is a URL with batch parameter (e.g. /verify?batch=VV-XXX), extract the batch parameter
  try {
    if (rawCode.includes('?')) {
      const urlObj = new URL(rawCode, 'https://vedahvital.com');
      const b = urlObj.searchParams.get('batch');
      if (b) rawCode = b.trim();
    }
  } catch {
    // not a URL, use raw string
  }

  // Case-insensitive lookup against both QR code token and product batch number
  const escapedCode = rawCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const qr = await QrCode.findOne({
    $or: [
      { code: rawCode },
      { code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
      { 'product.batchNo': rawCode },
      { 'product.batchNo': { $regex: new RegExp(`^${escapedCode}$`, 'i') } }
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

  // Consolidate lab reports (merging heavy metals & microbial into single report, plus allergens)
  const mergedHeavyMetalsMicrobial = [
    ...(qr.labReports?.heavyMetalsMicrobial || []),
    ...(qr.labReports?.heavyMetals || []),
    ...(qr.labReports?.microbial || [])
  ];
  const formattedLabReports = {
    potency: qr.labReports?.potency || [],
    heavyMetalsMicrobial: mergedHeavyMetalsMicrobial,
    allergens: qr.labReports?.allergens || [],
    heavyMetals: qr.labReports?.heavyMetals || [],
    microbial: qr.labReports?.microbial || []
  };

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
      labReports: formattedLabReports,
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
    labReports: formattedLabReports,
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
        { code: { $regex: new RegExp(`^${escapedCode}$`, 'i') } },
        { 'product.batchNo': code },
        { 'product.batchNo': { $regex: new RegExp(`^${escapedCode}$`, 'i') } }
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

    const mergedHeavyMetalsMicrobial = [
      ...(qrDoc.labReports?.heavyMetalsMicrobial || []),
      ...(qrDoc.labReports?.heavyMetals || []),
      ...(qrDoc.labReports?.microbial || [])
    ];
    const formattedLabReports = {
      potency: qrDoc.labReports?.potency || [],
      heavyMetalsMicrobial: mergedHeavyMetalsMicrobial,
      allergens: qrDoc.labReports?.allergens || [],
      heavyMetals: qrDoc.labReports?.heavyMetals || [],
      microbial: qrDoc.labReports?.microbial || []
    };

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
        labReports: formattedLabReports,
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
      labReports: formattedLabReports,
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

async function testGenerate(req, res) {
  try {
    const prefix = process.env.QR_PREFIX || 'VV';
    const token = crypto.randomBytes(12).toString('hex');
    const code = `${prefix}-${token}`;

    const defaultLabReportImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="100%" height="100%" fill="%23f8fafc"/><text x="50%" y="40%" font-size="20" font-family="sans-serif" fill="%230a192f" text-anchor="middle" font-weight="bold">VEDAH VITAL</text><text x="50%" y="60%" font-size="14" font-family="sans-serif" fill="%234a5568" text-anchor="middle">Official Lab Analysis Certificate</text></svg>';

    const product = req.body?.product || {
      name: 'KSM-66® Ashwagandha Root Extract',
      brand: 'VEDAH VITAL',
      strength: '500 mg',
      blackPepperExtract: '5 mg',
      packSize: '60 Vegan Capsules',
      batchNo: `BATCH-TEST-${Date.now().toString().slice(-4)}`,
      mfgDate: '10/2026',
      expDate: '09/2028'
    };

    const labReports = req.body?.labReports || {
      potency: [defaultLabReportImage],
      heavyMetalsMicrobial: [defaultLabReportImage],
      allergens: [defaultLabReportImage],
      heavyMetals: [defaultLabReportImage],
      microbial: [defaultLabReportImage]
    };

    const doc = await QrCode.create({
      code,
      used: false,
      usedAt: null,
      scanCount: 0,
      product,
      labReports
    });

    return res.json({
      success: true,
      message: 'Test QR code generated successfully',
      code: doc.code,
      qrUrl: `https://vedahvital.com/verify?batch=${doc.code}&source=qr`,
      product: doc.product,
      labReports: doc.labReports
    });
  } catch (err) {
    console.error('Test generation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { contact, verifyQr, verifyQrImage, subscribe, testGenerate };
