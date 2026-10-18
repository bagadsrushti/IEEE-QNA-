const express = require('express');
const router = express.Router();
const { getOverviewStats, getQRCode } = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

// Protected overview analytics
router.get('/overview', protect, getOverviewStats);

// QR Code route (allows admin to fetch or display QR code pointing to public URL)
router.get('/qr', protect, getQRCode);

module.exports = router;
