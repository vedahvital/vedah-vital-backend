'use strict';

const { z } = require('zod');
const Admin = require('../models/Admin');

const createAdminSchema = z.object({
  email: z.string().email()
});

const toggleAdminSchema = z.object({
  isActive: z.boolean()
});

async function listAdmins(req, res) {
  const admins = await Admin.find().sort({ createdAt: -1 });
  res.json({
    items: admins.map((a) => ({
      id: a._id.toString(),
      email: a.email,
      isActive: a.isActive,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }))
  });
}

async function createAdmin(req, res) {
  const { email } = createAdminSchema.parse(req.body);
  const normalizedEmail = email.toLowerCase();

  const existing = await Admin.findOne({ email: normalizedEmail });
  if (existing) {
    // Re-activate if disabled, otherwise just return it
    if (!existing.isActive) {
      existing.isActive = true;
      await existing.save();
    }
    return res.json({
      id: existing._id.toString(),
      email: existing.email,
      isActive: existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt
    });
  }

  const admin = await Admin.create({ email: normalizedEmail, isActive: true });
  return res.status(201).json({
    id: admin._id.toString(),
    email: admin.email,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  });
}

async function toggleAdmin(req, res) {
  const { id } = req.params;
  const { isActive } = toggleAdminSchema.parse(req.body);

  const admin = await Admin.findById(id);
  if (!admin) return res.status(404).json({ error: 'Admin not found' });

  // Prevent disabling your own account
  if (!isActive && admin.email === req.user?.email) {
    return res.status(400).json({ error: 'You cannot disable your own account' });
  }

  admin.isActive = isActive;
  await admin.save();

  return res.json({
    id: admin._id.toString(),
    email: admin.email,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt
  });
}

module.exports = { listAdmins, createAdmin, toggleAdmin };
