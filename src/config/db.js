const mongoose = require('mongoose');

async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vedah-vital';
  if (!uri) {
    throw new Error('Missing MONGODB_URI');
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connecting',   () => console.log('[db] Connecting to MongoDB…'));
  mongoose.connection.on('connected',    () => console.log('[db] Connected to MongoDB ✓'));
  mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB disconnected'));
  mongoose.connection.on('error',        (err) => console.error('[db] MongoDB error:', err.message));

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || undefined
  });
}

module.exports = { connectDb };
