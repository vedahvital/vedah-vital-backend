const ContactSubmission = require('../models/ContactSubmission');

async function listContacts(req, res, next) {
  try {
    const contacts = await ContactSubmission.find().sort({ createdAt: -1 });
    res.json({ contacts });
  } catch (err) {
    next(err);
  }
}

async function updateContactStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const contact = await ContactSubmission.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.json({ contact });
  } catch (err) {
    next(err);
  }
}

async function deleteContact(req, res, next) {
  try {
    const { id } = req.params;
    await ContactSubmission.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listContacts, updateContactStatus, deleteContact };
