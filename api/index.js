const dotenv = require('dotenv');

dotenv.config();

const { createApp } = require('../src/app');
require('../src/config/db');

const app = createApp();

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Vedah Vital backend listening on port ${PORT}`);
  });
}

module.exports = app;
