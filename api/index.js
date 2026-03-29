const dotenv = require('dotenv');

dotenv.config();

const { createApp } = require('../src/app');
require('../src/config/db');

const PORT = process.env.PORT || 5000;

async function start() {

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Vedah Vital backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
