const QRCode = require('qrcode');
const Question = require('../models/Question');
const Cluster = require('../models/Cluster');
const aiService = require('../services/aiService');

const getOverviewStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalQuestions,
      totalClusters,
      topCluster,
      questionsToday,
      aiHealth
    ] = await Promise.all([
      Question.countDocuments(),
      Cluster.countDocuments(),
      Cluster.findOne().sort('-questionCount').select('title questionCount clusterNumber'),
      Question.countDocuments({ createdAt: { $gte: todayStart } }),
      aiService.checkHealth()
    ]);

    // Language distribution aggregation
    const langAgg = await Question.aggregate([
      {
        $group: {
          _id: '$detectedLanguage',
          count: { $sum: 1 }
        }
      }
    ]);

    const languageDistribution = {
      en: 0,
      hi: 0,
      mr: 0,
      hinglish: 0,
      mixed: 0
    };

    langAgg.forEach(item => {
      if (item._id && languageDistribution[item._id] !== undefined) {
        languageDistribution[item._id] = item.count;
      } else if (item._id) {
        languageDistribution.mixed = (languageDistribution.mixed || 0) + item.count;
      }
    });

    // Submissions timeline (grouped by date over recent period)
    const trendAgg = await Question.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 14 }
    ]);

    const submissionTrend = trendAgg.map(t => ({
      date: t._id,
      count: t.count
    }));

    // Top 5 topics for bar chart
    const topTopics = await Cluster.find({})
      .sort('-questionCount')
      .limit(5)
      .select('title questionCount clusterNumber');

    return res.status(200).json({
      success: true,
      stats: {
        totalQuestions,
        totalClusters,
        topCluster: topCluster ? {
          title: topCluster.title,
          questionCount: topCluster.questionCount,
          clusterNumber: topCluster.clusterNumber
        } : null,
        questionsToday,
        languageDistribution,
        submissionTrend,
        topTopics: topTopics.map(t => ({
          name: t.title.length > 25 ? t.title.substring(0, 22) + '...' : t.title,
          fullTitle: t.title,
          count: t.questionCount
        })),
        aiService: aiHealth
      }
    });
  } catch (err) {
    console.error('[Overview Stats Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve overview analytics'
    });
  }
};

const getQRCode = async (req, res) => {
  try {
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5173';
    
    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a', // Navy blue
        light: '#ffffff'
      }
    });

    return res.status(200).json({
      success: true,
      publicUrl,
      qrDataUrl
    });
  } catch (err) {
    console.error('[QR Code Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
};

module.exports = { getOverviewStats, getQRCode };
