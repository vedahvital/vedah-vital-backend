const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { notFoundHandler, errorHandler } = require('./middleware/errors');
const publicRoutes = require('./routes/public');
const cmsRoutes = require('./routes/cms');
const reviewController = require('./controllers/reviewController');

function createApp() {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  // Ensure DB connected on serverless requests
  app.use(async (req, res, next) => {
    if (req.path === '/') return next();
    try {
      const { connectDB } = require('./config/db');
      await connectDB();
      next();
    } catch (err) {
      console.error('Database connection middleware error:', err);
      res.status(500).json({ success: false, message: 'Database connection failed' });
    }
  });

  app.get('/', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/public', publicRoutes);
  app.use('/api/cms', cmsRoutes);
  app.use('/api', reviewController);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
