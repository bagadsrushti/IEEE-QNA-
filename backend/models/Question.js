const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    originalText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [1000, 'Question text cannot exceed 1000 characters']
    },
    language: {
      type: String,
      default: 'auto',
      enum: ['auto', 'en', 'hi', 'mr', 'hinglish', 'mixed']
    },
    detectedLanguage: {
      type: String,
      default: 'en'
    },
    embedding: {
      type: [Number],
      select: true // Stored directly with question
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cluster',
      default: null,
      index: true
    },
    similarityToCentroid: {
      type: Number,
      default: 0
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'clustered', 'unassigned'],
      default: 'pending',
      index: true
    },
    clientIpHash: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

QuestionSchema.index({ createdAt: -1 });
QuestionSchema.index({ detectedLanguage: 1 });

module.exports = mongoose.model('Question', QuestionSchema);
