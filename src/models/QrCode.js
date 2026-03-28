const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    sku: { type: String, default: '' },
    batchNo: { type: String, default: '' },
    mfgDate: { type: String, default: '' },
    expDate: { type: String, default: '' }
  },
  { _id: false }
);

const QrCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    used: { type: Boolean, default: false, index: true },
    usedAt: { type: Date, default: null },
    product: { type: ProductSchema, default: () => ({}) }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QrCode', QrCodeSchema);
