const express = require('express');
const router = express.Router();
const { submitQuestion, getQuestions } = require('../controllers/questionController');
const { protect } = require('../middleware/authMiddleware');
const { questionSubmissionLimiter } = require('../middleware/rateLimiter');

// Public question submission endpoint with rate limiting
router.post('/submit', questionSubmissionLimiter, submitQuestion);

// Protected endpoint to view/filter all questions in admin dashboard
router.get('/', protect, getQuestions);

module.exports = router;
