const crypto = require('crypto');
const { z } = require('zod');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const QrCodeModel = require('../models/QrCode');

const generateSchema = z.object({
  count: z.number().int().min(1).max(500).default(1),
  product: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      sku: z.string().optional(),
      batchNo: z.string().optional(),
      mfgDate: z.string().optional(),
      expDate: z.string().optional()
    })
    .optional()
});

const updateUsedSchema = z.object({
  used: z.boolean()
});

const exportSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500)
});

function createCode() {
  const prefix = process.env.QR_PREFIX || 'VV';
  const token = crypto.randomBytes(12).toString('hex');
  return `${prefix}-${token}`;
}

async function generate(req, res) {
  const parsed = generateSchema.parse(req.body || {});

  const items = [];
  for (let i = 0; i < parsed.count; i += 1) {
    let code;
    for (let tries = 0; tries < 5; tries += 1) {
      code = createCode();
      const exists = await QrCodeModel.exists({ code });
      if (!exists) break;
    }

    const doc = await QrCodeModel.create({
      code,
      used: false,
      usedAt: null,
      product: parsed.product || {}
    });

    items.push(doc);
  }

  res.json({
    items: items.map((d) => ({
      id: d._id.toString(),
      code: d.code,
      used: d.used,
      product: d.product,
      createdAt: d.createdAt
    }))
  });
}

async function list(req, res) {
  const { used } = req.query;
  const filter = {};
  if (used === 'true') filter.used = true;
  if (used === 'false') filter.used = false;

  const limit = req.query.limit ? Math.min(Number(req.query.limit), 500) : 100;
  const skip = req.query.skip ? Number(req.query.skip) : 0;

  const [items, total, totalAll, totalUsed] = await Promise.all([
    QrCodeModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    QrCodeModel.countDocuments(filter),
    QrCodeModel.countDocuments({}),
    QrCodeModel.countDocuments({ used: true })
  ]);

  res.json({
    total,
    totalAll,
    totalUsed,
    totalUnused: totalAll - totalUsed,
    items: items.map((d) => ({
      id: d._id.toString(),
      code: d.code,
      used: d.used,
      usedAt: d.usedAt,
      product: d.product,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }))
  });
}

async function details(req, res) {
  const { id } = req.params;
  const d = await QrCodeModel.findById(id);
  if (!d) return res.status(404).json({ error: 'Not found' });

  const qrDataUrl = await QRCode.toDataURL(d.code, { margin: 1, width: 256 });

  return res.json({
    id: d._id.toString(),
    code: d.code,
    used: d.used,
    usedAt: d.usedAt,
    product: d.product,
    qrDataUrl,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  });
}

async function updateUsed(req, res) {
  const { id } = req.params;
  const { used } = updateUsedSchema.parse(req.body);

  const d = await QrCodeModel.findById(id);
  if (!d) return res.status(404).json({ error: 'Not found' });

  d.used = used;
  d.usedAt = used ? new Date() : null;
  await d.save();

  return res.json({
    id: d._id.toString(),
    code: d.code,
    used: d.used,
    usedAt: d.usedAt,
    product: d.product,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt
  });
}

async function exportPdf(req, res) {
  const { ids } = exportSchema.parse(req.body);
  const docs = await QrCodeModel.find({ _id: { $in: ids } }).sort({ createdAt: -1 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="qrcodes.pdf"');

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const qrSize = 160;
  const cols = 2;
  const cellWidth = pageWidth / cols;
  let x = doc.page.margins.left;
  let y = doc.page.margins.top;

  for (let i = 0; i < docs.length; i += 1) {
    const item = docs[i];
    const buf = await QRCode.toBuffer(item.code, { width: qrSize, margin: 1 });

    doc.image(buf, x + (cellWidth - qrSize) / 2, y, { width: qrSize });
    doc.fontSize(10).text(item.code, x, y + qrSize + 6, { width: cellWidth, align: 'center' });

    if ((i + 1) % cols === 0) {
      x = doc.page.margins.left;
      y += qrSize + 40;
      if (y + qrSize + 60 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    } else {
      x += cellWidth;
    }
  }

  doc.end();
}

module.exports = { generate, list, details, updateUsed, exportPdf };
