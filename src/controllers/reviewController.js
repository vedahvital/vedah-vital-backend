const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// Get all reviews
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true }).sort({ createdAt: -1 });
    // If no reviews in the DB, fallback to mock data or empty array
    // Here we just return whatever is found, which is empty if none inserted yet.
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching reviews' });
  }
});

// Optionally create a new review publicly or internally depending on auth level
router.post('/reviews', async (req, res) => {
  try {
    const { name, email, review, rating } = req.body;
    const newReview = await Review.create({ name, email, review, rating });
    res.status(201).json(newReview);
  } catch (error) {
    res.status(400).json({ error: 'Invalid review data' });
  }
});

module.exports = router;