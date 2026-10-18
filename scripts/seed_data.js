require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const mongoose = require('mongoose');
const { connectDB, closeDB } = require('../backend/config/db');
const Question = require('../backend/models/Question');
const Cluster = require('../backend/models/Cluster');
const aiService = require('../backend/services/aiService');
const clusterEngine = require('../backend/services/clusterEngine');

const sampleQuestions = [
  // Cluster: DSA Learning Roadmap
  { text: "Give me a roadmap for DSA.", lang: "en" },
  { text: "How should I start learning DSA?", lang: "en" },
  { text: "DSA ka roadmap kaise banau?", lang: "hinglish" },
  { text: "मुझे DSA कैसे सीखना चाहिए?", lang: "hi" },
  { text: "मला DSA शिकायला सुरुवात कशी करावी?", lang: "mr" },
  { text: "DSA saathi best roadmap kay ahe?", lang: "mixed" },
  { text: "Which language is best for practicing DSA: C++ or Java?", lang: "en" },
  { text: "DSA sikhne ke liye kitna time lagta hai?", lang: "hinglish" },

  // Cluster: Web Development Projects
  { text: "What are good project ideas for web development?", lang: "en" },
  { text: "Best web development projects for beginners.", lang: "en" },
  { text: "Web development ke liye best projects konse hain?", lang: "hinglish" },
  { text: "वेब डेवलपमेंट के लिए कौन से प्रोजेक्ट्स अच्छे हैं?", lang: "hi" },
  { text: "वेब डेव्हलपमेंटसाठी चांगले प्रोजेक्ट्स कोणते आहेत?", lang: "mr" },
  { text: "Full stack web dev projects ideas dya.", lang: "mixed" },
  { text: "MERN stack projects for resume showcase.", lang: "en" },

  // Cluster: Resume & Campus Placements
  { text: "How to prepare a resume for software engineer campus placements?", lang: "en" },
  { text: "Campus placement ke liye resume tips kya hain?", lang: "hinglish" },
  { text: "प्लेसमेंटसाठी रेझ्युमे कसा बनवायचा?", lang: "mr" },
  { text: "नौकरी के इंटरव्यू के लिए रिज्यूमे कैसे बनाएं?", lang: "hi" },
  { text: "What projects should I highlight on my tech resume?", lang: "en" },

  // Cluster: Machine Learning & AI
  { text: "How to get started with machine learning and deep learning?", lang: "en" },
  { text: "Machine learning ke basics kaise start karein?", lang: "hinglish" },
  { text: "मशीन लर्निंग कैसे सीखें?", lang: "hi" },
  { text: "मशिन लर्निंग शिकण्यासाठी काय करावे?", lang: "mr" },

  // Cluster: Cloud & DevOps
  { text: "Is AWS certification necessary for freshers?", lang: "en" },
  { text: "Freshers ke liye AWS certification zaroori hai kya?", lang: "hinglish" },
  { text: "क्लाउड कम्प्यूटिंग आणि AWS बद्दल माहिती हवी आहे.", lang: "mr" },

  // Outliers / Specific Queries
  { text: "What is the procedure to apply for campus hostel accommodation?", lang: "en" },
  { text: "कॉलेज कॅन्टीनचे जेवण कसे आहे?", lang: "mr" },
  { text: "Kal college me holiday hai kya?", lang: "hinglish" }
];

async function seed() {
  console.log("=== Seeding Realistic Multilingual Question Data ===");
  await connectDB();

  console.log("Checking AI service health...");
  const health = await aiService.checkHealth();
  if (!health.online) {
    console.error("AI Service is not running at http://127.0.0.1:8000. Please start the AI service first!");
    process.exit(1);
  }
  console.log(`AI Service ready: ${health.data.model}`);

  // Clear existing questions and clusters for clean seed
  await Question.deleteMany({});
  await Cluster.deleteMany({});
  console.log("Cleared existing question & cluster collections.");

  console.log(`Processing ${sampleQuestions.length} sample multilingual questions...`);
  
  // Batch embed all texts for speed
  const texts = sampleQuestions.map(q => q.text);
  const embeddings = await aiService.getEmbeddings(texts);

  for (let i = 0; i < sampleQuestions.length; i++) {
    const item = sampleQuestions[i];
    const embedding = embeddings[i];
    const detectedLang = aiService.detectLanguage(item.text, item.lang);

    const questionDoc = new Question({
      questionId: `seed_q_${Date.now()}_${i + 1}`,
      originalText: item.text,
      language: item.lang,
      detectedLanguage: detectedLang,
      embedding,
      processingStatus: 'pending'
    });

    const res = await clusterEngine.assignQuestionToCluster(questionDoc, 0.62);
    console.log(`[${i + 1}/${sampleQuestions.length}] '${item.text.substring(0, 32)}...' -> ${res.action} ('${res.cluster.title}', sim: ${res.similarity?.toFixed(2) || '1.00'})`);
  }

  const clustersCount = await Cluster.countDocuments();
  const questionsCount = await Question.countDocuments();
  console.log("\n====================================================");
  console.log(` Seeding Complete!`);
  console.log(` Questions created: ${questionsCount}`);
  console.log(` Clusters formed: ${clustersCount}`);
  console.log("====================================================");

  const topClusters = await Cluster.find().sort('-questionCount').limit(5);
  topClusters.forEach((c, idx) => {
    console.log(` #${idx + 1}: ${c.title} (${c.questionCount} questions)`);
  });

  await closeDB();
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
