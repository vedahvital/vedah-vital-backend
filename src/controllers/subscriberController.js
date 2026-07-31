const Subscriber = require('../models/Subscriber');

async function listSubscribers(req, res, next) {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ subscribers });
  } catch (err) {
    next(err);
  }
}

async function deleteSubscriber(req, res, next) {
  try {
    const { id } = req.params;
    await Subscriber.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listSubscribers, deleteSubscriber };
