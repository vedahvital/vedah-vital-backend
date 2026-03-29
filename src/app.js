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
