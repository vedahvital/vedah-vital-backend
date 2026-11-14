const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'KSM-66® Ashwagandha Root Extract' },
    brand: { type: String, default: 'VEDAH VITAL' },
    strength: { type: String, default: '500 mg' },
    blackPepperExtract: { type: String, default: '5 mg' },
    packSize: { type: String, default: '60 Vegan Capsules' },
    description: { type: String, default: '' },
    sku: { type: String, default: '' },
    batchNo: { type: String, default: '' },
    mfgDate: { type: String, default: '' },
    expDate: { type: String, default: '' }
  },
  { _id: false }
);

const LabReportsSchema = new mongoose.Schema(
  {
    potency: { type: [String], default: [] }, // Active potency assay images
    heavyMetals: { type: [String], default: [] }, // Heavy metals & toxins report images
    microbial: { type: [String], default: [] } // Microbial screening report images
  },
  { _id: false }
);

const QrCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    used: { type: Boolean, default: false, index: true },
    usedAt: { type: Date, default: null },
    scanCount: { type: Number, default: 0 },
    lastScannedAt: { type: Date, default: null },
    product: { type: ProductSchema, default: () => ({}) },
    labReports: { type: LabReportsSchema, default: () => ({ potency: [], heavyMetals: [], microbial: [] }) }
  },
  { timestamps: true }
);

module.exports = mongoose.model('QrCode', QrCodeSchema);
