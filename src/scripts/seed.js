'use strict';

/**
 * Seed script — creates a default admin user if none exists.
 *
 * Usage:
 *   node src/scripts/seed.js
 *   -- or --
 *   npm run seed
 *
 * Override the email via env:
 *   SEED_ADMIN_EMAIL=me@example.com node src/scripts/seed.js
 */

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const SEED_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@vedahvital.com').toLowerCase();
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vedah-vital';

async function seed() {
  await mongoose.connect(MONGO_URI, {
    dbName: process.env.MONGODB_DB_NAME || undefined
  });
  console.log('Connected to MongoDB');

  const existing = await Admin.findOne({ email: SEED_EMAIL });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
      console.log(`✔  Re-activated existing admin: ${SEED_EMAIL}`);
    } else {
      console.log(`✔  Admin already exists and is active: ${SEED_EMAIL}`);
    }
  } else {
    await Admin.create({ email: SEED_EMAIL, isActive: true });
    console.log(`✔  Created default admin: ${SEED_EMAIL}`);
  }

  console.log('\nDefault login email:', SEED_EMAIL);
  console.log('Use the CMS login page → enter this email → receive OTP → sign in.\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
