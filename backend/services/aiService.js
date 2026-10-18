const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

class AIService {
  constructor() {
    this.baseUrl = AI_SERVICE_URL;
    this.timeout = 15000;
  }

  /**
   * Fast cosine similarity calculation for two normalized 384-d vectors.
   * Since vectors are normalized (L2 norm = 1), cosine_sim(a, b) = a . b
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return dot;
  }

  /**
   * Health check on Python FastAPI service
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 4000
      });
      return {
        online: true,
        data: response.data
      };
    } catch (err) {
      return {
        online: false,
        error: `AI Service unreachable at ${this.baseUrl}: ${err.message}`
      };
    }
  }

  /**
   * Get semantic embedding for one or more text inputs
   */
  async getEmbeddings(texts) {
    if (!texts || texts.length === 0) return [];
    try {
      const response = await axios.post(
        `${this.baseUrl}/embed`,
        { texts },
        { timeout: this.timeout }
      );
      return response.data.embeddings;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      throw new Error(`AI Embedding generation failed (${this.baseUrl}): ${msg}`);
    }
  }

  /**
   * Trigger batch agglomerative clustering in Python service
   */
  async clusterBatch(questions, similarityThreshold = 0.65) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/cluster`,
        {
          questions: questions.map(q => ({
            id: q._id ? q._id.toString() : q.id,
            text: q.originalText || q.text,
            language: q.language || q.detectedLanguage || 'auto',
            embedding: q.embedding
          })),
          similarity_threshold: similarityThreshold
        },
        { timeout: 60000 }
      );
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      throw new Error(`AI Batch clustering failed (${this.baseUrl}): ${msg}`);
    }
  }

  /**
   * Detect question language (English, Hindi, Marathi, Hinglish, Marathi-English)
   */
  detectLanguage(text, userSelected = 'auto') {
    if (userSelected && userSelected !== 'auto') {
      return userSelected;
    }

    if (!text || typeof text !== 'string') return 'en';

    const devanagariRegex = /[\u0900-\u097F]/;
    const isDevanagari = devanagariRegex.test(text);

    if (isDevanagari) {
      // Check for Marathi-specific character ळ (\u0933) and Marathi indicator words
      const marathiIndicators = [
        /\u0933/, // ळ
        /\bमला\b/, /\bकसा\b/, /\bकशी\b/, /\bकसे\b/, /\bकरावे\b/,
        /\bआहे\b/, /\bआहेत\b/, /\bनाही\b/, /\bकाय\b/, /\bसुरुवात\b/,
        /\bचांगले\b/, /\bकोणते\b/, /\bसाठी\b/
      ];

      const hasMarathiMarker = marathiIndicators.some(pattern => pattern.test(text));
      return hasMarathiMarker ? 'mr' : 'hi';
    }

    // Latin script: Check if English or mixed Romanized (Hinglish / Marathi-English)
    const hinglishMarkers = [
      /\bkaise\b/i, /\bkya\b/i, /\bkarein\b/i, /\bkaru\b/i, /\bhai\b/i,
      /\bhain\b/i, /\bbatao\b/i, /\bmujhe\b/i, /\bchahiye\b/i, /\bseekhe\b/i,
      /\bbanau\b/i, /\bkonse\b/i, /\bbest\b.*\bhai\b/i
    ];

    const marathiEnglishMarkers = [
      /\bsaathi\b/i, /\bkay\b/i, /\bahe\b/i, /\bkashi\b/i, /\bkaravi\b/i,
      /\bkasa\b/i, /\bmala\b/i, /\bchangla\b/i
    ];

    if (marathiEnglishMarkers.some(p => p.test(text))) {
      return 'mixed';
    }

    if (hinglishMarkers.some(p => p.test(text))) {
      return 'hinglish';
    }

    return 'en';
  }
}

module.exports = new AIService();
