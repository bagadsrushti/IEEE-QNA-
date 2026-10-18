const mongoose = require('mongoose');

const ClusterSchema = new mongoose.Schema(
  {
    clusterNumber: {
      type: Number,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    summary: {
      type: String,
      default: ''
    },
    representativeQuestion: {
      type: String,
      default: ''
    },
    questionCount: {
      type: Number,
      default: 0,
      index: true
    },
    languageDistribution: {
      en: { type: Number, default: 0 },
      hi: { type: Number, default: 0 },
      mr: { type: Number, default: 0 },
      hinglish: { type: Number, default: 0 },
      mixed: { type: Number, default: 0 }
    },
    centroid: {
      type: [Number],
      select: true
    },
    demandScore: {
      type: Number,
      default: 0,
      index: true
    },
    lastSubmissionAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

ClusterSchema.index({ questionCount: -1, lastSubmissionAt: -1 });

module.exports = mongoose.model('Cluster', ClusterSchema);
