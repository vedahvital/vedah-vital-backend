const express = require('express');
const multer = require('multer');

const { contact, verifyQr, verifyQrImage } = require('../controllers/publicController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.post('/contact', contact);
router.get('/verify/:code', verifyQr);
// Accept image uploads (multipart/form-data) with field name 'image'
router.post('/verify-image', upload.single('image'), verifyQrImage);

module.exports = router;
