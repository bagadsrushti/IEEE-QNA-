const crypto = require('crypto');
const Question = require('../models/Question');
const Cluster = require('../models/Cluster');
const aiService = require('../services/aiService');
const clusterEngine = require('../services/clusterEngine');

// In-memory cache for fast duplicate submission debouncing (15 seconds)
const recentSubmissionsCache = new Map();

const hashClient = (ip, text) => {
  return crypto.createHash('sha256').update(`${ip}_${text.trim().toLowerCase()}`).digest('hex');
};

const submitQuestion = async (req, res) => {
  try {
    const { text, language = 'auto' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid question with at least 5 characters.'
      });
    }

    if (text.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Question exceeds the maximum length of 1000 characters.'
      });
    }

    const cleanText = text.trim();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const submissionHash = hashClient(clientIp, cleanText);

    // Debounce accidental immediate double-clicks (within 15 seconds)
    const now = Date.now();
    if (recentSubmissionsCache.has(submissionHash)) {
      const lastTime = recentSubmissionsCache.get(submissionHash);
      if (now - lastTime < 15000) {
        return res.status(429).json({
          success: false,
          isDuplicate: true,
          message: 'This question was just submitted. To prevent accidental duplicates, please wait a moment.'
        });
      }
    }
    recentSubmissionsCache.set(submissionHash, now);

    // Clean up old entries from cache every 100 submissions
    if (recentSubmissionsCache.size > 200) {
      for (const [key, ts] of recentSubmissionsCache.entries()) {
        if (now - ts > 60000) recentSubmissionsCache.delete(key);
      }
    }

    // Detect language
    const detectedLanguage = aiService.detectLanguage(cleanText, language);

    // Generate unique question ID
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Verify AI service availability
    const health = await aiService.checkHealth();
    if (!health.online) {
      // Graceful error handling without faking AI clustering
      const pendingQuestion = new Question({
        questionId,
        originalText: cleanText,
        language: language || 'auto',
        detectedLanguage,
        processingStatus: 'pending',
        clientIpHash: crypto.createHash('sha256').update(clientIp).digest('hex')
      });
      await pendingQuestion.save();

      return res.status(503).json({
        success: false,
        aiOffline: true,
        message: 'The AI Semantic Embedding Service is currently offline or warming up. Your question has been securely recorded and queued for clustering once the model is active.',
        questionId
      });
    }

    // Generate semantic embedding (384-d vector)
    const [embedding] = await aiService.getEmbeddings([cleanText]);

    if (!embedding || embedding.length !== 384) {
      throw new Error('Failed to generate valid 384-dimensional embedding vector');
    }

    // Create question document
    const questionDoc = new Question({
      questionId,
      originalText: cleanText,
      language: language || 'auto',
      detectedLanguage,
      embedding,
      processingStatus: 'pending',
      clientIpHash: crypto.createHash('sha256').update(clientIp).digest('hex')
    });

    // Incrementally assign to existing cluster or create new one
    const clusterResult = await clusterEngine.assignQuestionToCluster(questionDoc);

    return res.status(201).json({
      success: true,
      message: 'Question submitted and clustered successfully!',
      question: {
        id: questionDoc._id,
        questionId: questionDoc.questionId,
        text: questionDoc.originalText,
        detectedLanguage: questionDoc.detectedLanguage,
        processingStatus: questionDoc.processingStatus,
        createdAt: questionDoc.createdAt
      },
      cluster: {
        id: clusterResult.cluster._id,
        clusterNumber: clusterResult.cluster.clusterNumber,
        title: clusterResult.cluster.title,
        questionCount: clusterResult.cluster.questionCount,
        action: clusterResult.action,
        similarity: clusterResult.similarity
      }
    });
  } catch (err) {
    console.error('[Question Submission Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error while processing question submission'
    });
  }
};

const getQuestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      language,
      clusterId,
      search,
      status
    } = req.query;

    const query = {};

    if (language && language !== 'all') {
      query.detectedLanguage = language;
    }

    if (clusterId && clusterId !== 'all') {
      query.clusterId = clusterId;
    }

    if (status && status !== 'all') {
      query.processingStatus = status;
    }

    if (search && search.trim() !== '') {
      query.originalText = { $regex: search.trim(), $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate('clusterId', 'clusterNumber title')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .select('-embedding'),
      Question.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      questions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('[Get Questions Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve questions list'
    });
  }
};

module.exports = { submitQuestion, getQuestions };
