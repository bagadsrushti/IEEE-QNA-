const Question = require('../models/Question');
const Cluster = require('../models/Cluster');
const aiService = require('./aiService');

class ClusterEngine {
  constructor() {
    this.defaultThreshold = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.65;
  }

  getThreshold() {
    return parseFloat(process.env.SIMILARITY_THRESHOLD) || this.defaultThreshold;
  }

  /**
   * Helper to normalize a vector
   */
  normalizeVector(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq) || 1.0;
    return vec.map(val => val / norm);
  }

  /**
   * Generates a readable topic title from question text
   */
  generateTopicTitle(text) {
    if (!text) return 'General Inquiry';
    let clean = text.trim().replace(/[\?।!.,]+$/, '').trim();

    const prefixes = [
      /^(give me a|tell me a|provide a|how to|how can i|how should i|what is|what are|explain|best way to)\s+/i,
      /^(roadmap for|guide for|start learning|how do i start|basics of)\s+/i,
      /^(mujhe|humko|kaise|kya|batao|kripya)\s+/i,
      /^(mala|kase|kay|sangaa)\s+/i
    ];

    let simplified = clean;
    for (const pat of prefixes) {
      simplified = simplified.replace(pat, '').trim();
    }

    if (simplified.length > 2) {
      const title = simplified.charAt(0).toUpperCase() + simplified.slice(1);
      const words = title.split(/\s+/);
      return words.length > 8 ? words.slice(0, 8).join(' ') + '...' : title;
    }
    return clean;
  }

  /**
   * Assign question incrementally to an existing cluster or create a new one
   */
  async assignQuestionToCluster(questionDoc, threshold = null) {
    const simThreshold = threshold !== null ? threshold : this.getThreshold();
    const clusters = await Cluster.find({ centroid: { $exists: true, $ne: [] } });

    let bestCluster = null;
    let highestSim = -1;

    for (const cluster of clusters) {
      if (cluster.centroid && Array.isArray(cluster.centroid) && questionDoc.embedding && cluster.centroid.length === questionDoc.embedding.length) {
        const sim = aiService.cosineSimilarity(questionDoc.embedding, cluster.centroid);
        if (sim > highestSim) {
          highestSim = sim;
          bestCluster = cluster;
        }
      }
    }

    const langKey = questionDoc.detectedLanguage || 'en';

    // If matches an existing cluster above threshold
    if (bestCluster && highestSim >= simThreshold && questionDoc.embedding) {
      // Update centroid using weighted average
      const count = bestCluster.questionCount || 1;
      const dim = questionDoc.embedding.length;
      const newCentroid = new Array(dim);
      for (let i = 0; i < dim; i++) {
        newCentroid[i] = (bestCluster.centroid[i] * count + questionDoc.embedding[i]) / (count + 1);
      }
      bestCluster.centroid = this.normalizeVector(newCentroid);
      bestCluster.questionCount = count + 1;
      bestCluster.lastSubmissionAt = new Date();
      bestCluster.demandScore = (bestCluster.questionCount * 10);

      // Update language distribution
      if (!bestCluster.languageDistribution) {
        bestCluster.languageDistribution = { en: 0, hi: 0, mr: 0, hinglish: 0, mixed: 0 };
      }
      bestCluster.languageDistribution[langKey] = (bestCluster.languageDistribution[langKey] || 0) + 1;

      await bestCluster.save();

      questionDoc.clusterId = bestCluster._id;
      questionDoc.processingStatus = 'clustered';
      questionDoc.similarityToCentroid = Math.round(highestSim * 1000) / 1000;
      await questionDoc.save();

      return {
        action: 'assigned_existing',
        cluster: bestCluster,
        similarity: highestSim
      };
    }

    // Otherwise create a new cluster
    const highestNumberCluster = await Cluster.findOne().sort('-clusterNumber');
    const nextNumber = highestNumberCluster ? highestNumberCluster.clusterNumber + 1 : 1;

    const newTitle = this.generateTopicTitle(questionDoc.originalText);
    const newCluster = new Cluster({
      clusterNumber: nextNumber,
      title: newTitle,
      summary: `Topic based on '${questionDoc.originalText}'`,
      representativeQuestion: questionDoc.originalText,
      questionCount: 1,
      centroid: questionDoc.embedding,
      demandScore: 10,
      languageDistribution: {
        en: langKey === 'en' ? 1 : 0,
        hi: langKey === 'hi' ? 1 : 0,
        mr: langKey === 'mr' ? 1 : 0,
        hinglish: langKey === 'hinglish' ? 1 : 0,
        mixed: langKey === 'mixed' ? 1 : 0
      },
      lastSubmissionAt: new Date()
    });

    await newCluster.save();

    questionDoc.clusterId = newCluster._id;
    questionDoc.processingStatus = 'clustered';
    questionDoc.similarityToCentroid = 1.0;
    await questionDoc.save();

    return {
      action: 'created_new',
      cluster: newCluster,
      similarity: 1.0
    };
  }

  /**
   * Run full batch reclustering across all questions in the database
   */
  async reclusterAll(threshold = null) {
    const simThreshold = threshold !== null ? threshold : this.getThreshold();
    const questions = await Question.find({});

    if (questions.length === 0) {
      await Cluster.deleteMany({});
      return { clustersCount: 0, questionsCount: 0, threshold: simThreshold };
    }

    // Call Python AI service for agglomerative clustering
    const clusterResult = await aiService.clusterBatch(questions, simThreshold);
    const generatedClusters = clusterResult.clusters;

    // Remove old clusters
    await Cluster.deleteMany({});

    // Save newly calculated clusters and map questions
    let clusterCounter = 1;
    for (const c of generatedClusters) {
      const newCluster = new Cluster({
        clusterNumber: clusterCounter++,
        title: c.title,
        summary: c.summary,
        representativeQuestion: c.representative_question,
        questionCount: c.question_count,
        languageDistribution: c.language_distribution,
        centroid: c.centroid,
        demandScore: c.question_count * 10,
        lastSubmissionAt: new Date()
      });

      await newCluster.save();

      // Update member questions
      await Question.updateMany(
        { _id: { $in: c.question_ids } },
        {
          $set: {
            clusterId: newCluster._id,
            processingStatus: 'clustered'
          }
        }
      );
    }

    return {
      clustersCount: generatedClusters.length,
      questionsCount: questions.length,
      threshold: simThreshold
    };
  }

  /**
   * Merge sourceCluster into targetCluster
   */
  async mergeClusters(sourceClusterId, targetClusterId) {
    const source = await Cluster.findById(sourceClusterId);
    const target = await Cluster.findById(targetClusterId);

    if (!source || !target) {
      throw new Error('Source or Target cluster not found');
    }

    // Update questions pointing to source
    await Question.updateMany(
      { clusterId: source._id },
      { $set: { clusterId: target._id } }
    );

    // Update target stats
    const totalCount = target.questionCount + source.questionCount;
    
    // Merge centroids
    if (target.centroid && source.centroid && target.centroid.length === source.centroid.length) {
      const dim = target.centroid.length;
      const mergedCentroid = new Array(dim);
      for (let i = 0; i < dim; i++) {
        mergedCentroid[i] = (target.centroid[i] * target.questionCount + source.centroid[i] * source.questionCount) / totalCount;
      }
      target.centroid = this.normalizeVector(mergedCentroid);
    }

    target.questionCount = totalCount;
    target.demandScore = totalCount * 10;
    target.lastSubmissionAt = new Date(Math.max(
      new Date(target.lastSubmissionAt).getTime(),
      new Date(source.lastSubmissionAt).getTime()
    ));

    // Merge language distributions
    for (const [lang, count] of Object.entries(source.languageDistribution || {})) {
      target.languageDistribution[lang] = (target.languageDistribution[lang] || 0) + count;
    }

    await target.save();
    await Cluster.findByIdAndDelete(source._id);

    return target;
  }

  /**
   * Move single question to a different cluster
   */
  async moveQuestion(questionId, newClusterId) {
    const question = await Question.findById(questionId);
    if (!question) throw new Error('Question not found');

    const oldClusterId = question.clusterId;
    const newCluster = await Cluster.findById(newClusterId);
    if (!newCluster) throw new Error('Target cluster not found');

    // Remove from old cluster
    if (oldClusterId) {
      const oldCluster = await Cluster.findById(oldClusterId);
      if (oldCluster) {
        oldCluster.questionCount = Math.max(0, oldCluster.questionCount - 1);
        const lang = question.detectedLanguage || 'en';
        if (oldCluster.languageDistribution && oldCluster.languageDistribution[lang]) {
          oldCluster.languageDistribution[lang] = Math.max(0, oldCluster.languageDistribution[lang] - 1);
        }
        await oldCluster.save();
      }
    }

    // Add to new cluster
    newCluster.questionCount += 1;
    const lang = question.detectedLanguage || 'en';
    if (!newCluster.languageDistribution) {
      newCluster.languageDistribution = { en: 0, hi: 0, mr: 0, hinglish: 0, mixed: 0 };
    }
    newCluster.languageDistribution[lang] = (newCluster.languageDistribution[lang] || 0) + 1;
    newCluster.lastSubmissionAt = new Date();
    await newCluster.save();

    question.clusterId = newCluster._id;
    await question.save();

    return { question, newCluster };
  }
}

module.exports = new ClusterEngine();
