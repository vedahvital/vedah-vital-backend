const express = require('express');

const { requestOtp, verifyOtp } = require('../controllers/authController');
const { requireCmsAuth } = require('../middleware/auth');
const { generate, list, details, updateUsed, exportPdf } = require('../controllers/qrController');
const { listAdmins, createAdmin, toggleAdmin } = require('../controllers/adminController');

const router = express.Router();

router.post('/auth/request-otp', requestOtp);
router.post('/auth/verify-otp', verifyOtp);

router.post('/qrcodes/generate', requireCmsAuth, generate);
router.get('/qrcodes', requireCmsAuth, list);
router.get('/qrcodes/:id', requireCmsAuth, details);
router.patch('/qrcodes/:id', requireCmsAuth, updateUsed);
router.post('/qrcodes/export/pdf', requireCmsAuth, exportPdf);

// Admin user management
router.get('/admins', requireCmsAuth, listAdmins);
router.post('/admins', requireCmsAuth, createAdmin);
router.patch('/admins/:id', requireCmsAuth, toggleAdmin);

module.exports = router;
