const axios = require('../backend/node_modules/axios');

const API_BASE = 'http://localhost:5000/api';

const sampleQuestions = [
  // Topic: DSA Learning Roadmap (in EN, Hinglish, HI, MR, Mixed)
  { text: "Give me a roadmap for DSA.", lang: "en" },
  { text: "How should I start learning DSA?", lang: "en" },
  { text: "DSA ka roadmap kaise banau?", lang: "hinglish" },
  { text: "मुझे DSA कैसे सीखना चाहिए?", lang: "hi" },
  { text: "मला DSA शिकायला सुरुवात कशी करावी?", lang: "mr" },
  { text: "DSA saathi best roadmap kay ahe?", lang: "mixed" },
  { text: "Which language is best for practicing DSA: C++ or Java?", lang: "en" },
  { text: "DSA sikhne ke liye kitna time lagta hai?", lang: "hinglish" },

  // Topic: Web Development Projects
  { text: "What are good project ideas for web development?", lang: "en" },
  { text: "Best web development projects for beginners.", lang: "en" },
  { text: "Web development ke liye best projects konse hain?", lang: "hinglish" },
  { text: "वेब डेवलपमेंट के लिए कौन से प्रोजेक्ट्स अच्छे हैं?", lang: "hi" },
  { text: "वेब डेव्हलपमेंटसाठी चांगले प्रोजेक्ट्स कोणते आहेत?", lang: "mr" },
  { text: "Full stack web dev projects ideas dya.", lang: "mixed" },
  { text: "MERN stack projects for resume showcase.", lang: "en" },

  // Topic: Resume & Campus Placements
  { text: "How to prepare a resume for software engineer campus placements?", lang: "en" },
  { text: "Campus placement ke liye resume tips kya hain?", lang: "hinglish" },
  { text: "प्लेसमेंटसाठी रेझ्युमे कसा बनवायचा?", lang: "mr" },
  { text: "नौकरी के इंटरव्यू के लिए रिज्यूमे कैसे बनाएं?", lang: "hi" },
  { text: "What technical projects should I highlight on my resume?", lang: "en" },

  // Topic: Machine Learning & AI
  { text: "How to get started with machine learning and deep learning?", lang: "en" },
  { text: "Machine learning ke basics kaise start karein?", lang: "hinglish" },
  { text: "मशीन लर्निंग कैसे सीखें?", lang: "hi" },
  { text: "मशिन लर्निंग शिकण्यासाठी काय करावे?", lang: "mr" },

  // Topic: Cloud & AWS
  { text: "Is AWS certification necessary for freshers?", lang: "en" },
  { text: "Freshers ke liye AWS certification zaroori hai kya?", lang: "hinglish" },
  { text: "क्लाउड कम्प्यूटिंग आणि AWS बद्दल माहिती हवी आहे.", lang: "mr" },

  // Topic: Campus Facilities / Outliers
  { text: "What is the procedure to apply for campus hostel accommodation?", lang: "en" },
  { text: "कॉलेज कॅन्टीनचे जेवण कसे आहे?", lang: "mr" }
];

async function seedData() {
  console.log("====================================================");
  console.log(" Seeding Multilingual Questions via HTTP API...");
  console.log("====================================================");

  let successCount = 0;

  for (let i = 0; i < sampleQuestions.length; i++) {
    const q = sampleQuestions[i];
    try {
      const res = await axios.post(`${API_BASE}/questions/submit`, {
        text: q.text,
        language: q.lang
      });
      const c = res.data.cluster;
      console.log(`[${i + 1}/${sampleQuestions.length}] (${q.lang}) "${q.text.substring(0, 30)}..." -> ${c.action} to "${c.title}" (Count: ${c.questionCount})`);
      successCount++;
    } catch (err) {
      console.error(`[Error on ${i + 1}] ${err.response?.data?.message || err.message}`);
    }
    // Small delay to simulate realistic arrival and respect rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log("====================================================");
  console.log(`Successfully seeded ${successCount} questions via API.`);

  // Fetch overview stats
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@clusterai.org',
    password: 'Admin@12345'
  });
  const token = loginRes.data.token;

  const statsRes = await axios.get(`${API_BASE}/stats/overview`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`\nCurrent Live Database Stats:`);
  console.log(`- Total Questions: ${statsRes.data.stats.totalQuestions}`);
  console.log(`- Total Clusters:  ${statsRes.data.stats.totalClusters}`);
  console.log(`- Top Topic:       ${statsRes.data.stats.topCluster?.title} (${statsRes.data.stats.topCluster?.questionCount} questions)`);
  console.log(`- Languages:       EN:${statsRes.data.stats.languageDistribution.en}, HI:${statsRes.data.stats.languageDistribution.hi}, MR:${statsRes.data.stats.languageDistribution.mr}, Hinglish:${statsRes.data.stats.languageDistribution.hinglish}, Mixed:${statsRes.data.stats.languageDistribution.mixed}`);
  console.log("====================================================");
}

seedData();
