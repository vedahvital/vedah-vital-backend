const mongoose = require('mongoose');
const dbUrl =process.env.MONGODB_URI + '/' + `${process.env.MONGODB_DB_NAME}` || 'mongodb://localhost:27017/vedah-vital';
mongoose.connect(dbUrl)
    .then(() => console.log('DB Connected!'))
    .catch((error) => console.error("Error in DB connect", error));

module.exports = mongoose