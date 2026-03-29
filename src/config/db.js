const mongoose = require('mongoose');
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/vedah-vital';
const dbName = process.env.MONGODB_DB_NAME || 'vedah-vital';
mongoose.connect(dbUrl, { dbName })
    .then(() => console.log('DB Connected!'))
    .catch((error) => console.error("Error in DB connect", error));

module.exports = mongoose