const mongoose = require('mongoose');

const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/vedah-vital';
const dbName = process.env.MONGODB_DB_NAME || 'vedah-vital';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName,
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(dbUrl, opts).then((mongooseInstance) => {
      console.log('MongoDB Connected successfully!');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = { connectDB };