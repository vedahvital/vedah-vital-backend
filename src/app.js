const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { notFoundHandler, errorHandler } = require('./middleware/errors');
const publicRoutes = require('./routes/public');
const cmsRoutes = require('./routes/cms');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/public', publicRoutes);
  app.use('/api/cms', cmsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
