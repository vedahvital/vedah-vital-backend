const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { notFoundHandler, errorHandler } = require('./middleware/errors');
const publicRoutes = require('./routes/public');
const cmsRoutes = require('./routes/cms');
const reviewController = require('./controllers/reviewController');

const allowedOrigins = [
  'https://vedah-vital-ui.vercel.app',
  'https://vedah-vital-cms.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

function createApp() {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g. curl, Postman, same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

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
