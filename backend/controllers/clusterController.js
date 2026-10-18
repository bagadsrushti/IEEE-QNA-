const Cluster = require('../models/Cluster');
const Question = require('../models/Question');
const clusterEngine = require('../services/clusterEngine');

const getRankedClusters = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search,
      sortBy = 'count' // 'count' | 'recent' | 'demand'
    } = req.query;

    const query = {};
    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { summary: { $regex: search.trim(), $options: 'i' } },
        { representativeQuestion: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    let sortOptions = { questionCount: -1, lastSubmissionAt: -1 };
    if (sortBy === 'recent') {
      sortOptions = { lastSubmissionAt: -1, questionCount: -1 };
    } else if (sortBy === 'demand') {
      sortOptions = { demandScore: -1, questionCount: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [clusters, total] = await Promise.all([
      Cluster.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-centroid'),
      Cluster.countDocuments(query)
    ]);

    // Attach dynamic rank number based on sort order
    const rankedClusters = clusters.map((c, index) => ({
      ...c.toObject(),
      rank: skip + index + 1
    }));

    return res.status(200).json({
      success: true,
      clusters: rankedClusters,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    console.error('[Get Clusters Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve topic clusters'
    });
  }
};

const getClusterDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const cluster = await Cluster.findById(id).select('-centroid');
    if (!cluster) {
      return res.status(404).json({ success: false, message: 'Cluster not found' });
    }

    const questions = await Question.find({ clusterId: cluster._id })
      .sort('-createdAt')
      .select('-embedding');

    return res.status(200).json({
      success: true,
      cluster,
      questions,
      totalQuestions: questions.length
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cluster details'
    });
  }
};

const updateClusterTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Title cannot be empty' });
    }

    const cluster = await Cluster.findById(id);
    if (!cluster) {
      return res.status(404).json({ success: false, message: 'Cluster not found' });
    }

    cluster.title = title.trim();
    if (summary !== undefined) {
      cluster.summary = summary.trim();
    }
    await cluster.save();

    return res.status(200).json({
      success: true,
      message: 'Cluster topic title updated successfully',
      cluster
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update cluster title'
    });
  }
};

const mergeClusters = async (req, res) => {
  try {
    const { sourceClusterId, targetClusterId } = req.body;

    if (!sourceClusterId || !targetClusterId) {
      return res.status(400).json({
        success: false,
        message: 'Must provide sourceClusterId and targetClusterId'
      });
    }

    if (sourceClusterId === targetClusterId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot merge a cluster into itself'
      });
    }

    const merged = await clusterEngine.mergeClusters(sourceClusterId, targetClusterId);

    return res.status(200).json({
      success: true,
      message: 'Clusters merged successfully',
      cluster: merged
    });
  } catch (err) {
    console.error('[Merge Clusters Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to merge clusters'
    });
  }
};

const moveQuestion = async (req, res) => {
  try {
    const { questionId, newClusterId } = req.body;

    if (!questionId || !newClusterId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both questionId and newClusterId'
      });
    }

    const result = await clusterEngine.moveQuestion(questionId, newClusterId);

    return res.status(200).json({
      success: true,
      message: 'Question moved to new topic cluster successfully',
      result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to move question'
    });
  }
};

const triggerRecluster = async (req, res) => {
  try {
    const { threshold } = req.body;
    const simThreshold = threshold ? parseFloat(threshold) : undefined;

    console.log(`[Admin] Reclustering requested with threshold: ${simThreshold || 'default'}`);
    const result = await clusterEngine.reclusterAll(simThreshold);

    return res.status(200).json({
      success: true,
      message: `Reclustering completed: ${result.clustersCount} clusters generated from ${result.questionsCount} questions.`,
      result
    });
  } catch (err) {
    console.error('[Trigger Recluster Error]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Reclustering process failed'
    });
  }
};

const exportCSV = async (req, res) => {
  try {
    const questions = await Question.find({})
      .populate('clusterId', 'clusterNumber title')
      .sort('-createdAt');

    // Build CSV strings safely escaping quotes and commas
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const headers = [
      'Question ID',
      'Original Text',
      'Detected Language',
      'Processing Status',
      'Cluster Number',
      'Cluster Title',
      'Similarity Score',
      'Submitted At'
    ];

    const rows = questions.map(q => [
      escapeCsv(q.questionId),
      escapeCsv(q.originalText),
      escapeCsv(q.detectedLanguage),
      escapeCsv(q.processingStatus),
      escapeCsv(q.clusterId?.clusterNumber || 'Unassigned'),
      escapeCsv(q.clusterId?.title || 'Unassigned'),
      escapeCsv(q.similarityToCentroid || 0),
      escapeCsv(q.createdAt ? q.createdAt.toISOString() : '')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="question_clusters_export.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('[Export CSV Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate CSV export'
    });
  }
};

module.exports = {
  getRankedClusters,
  getClusterDetails,
  updateClusterTitle,
  mergeClusters,
  moveQuestion,
  triggerRecluster,
  exportCSV
};
