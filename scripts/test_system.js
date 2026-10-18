const axios = require('../backend/node_modules/axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

let authToken = '';
let testClusterId = '';
let testQuestionId = '';

const tests = [
  {
    name: '1. AI Service Health Check',
    fn: async () => {
      const res = await axios.get(`${AI_URL}/health`);
      if (res.data.status !== 'ready' && res.data.status !== 'ok') {
        throw new Error(`AI Service status not ready: ${res.data.status}`);
      }
      return `Model: ${res.data.model}`;
    }
  },
  {
    name: '2. Multilingual Semantic Similarity: English vs Marathi',
    fn: async () => {
      const q1 = "How should I start learning DSA?";
      const q2 = "मला DSA शिकायला सुरुवात कशी करावी?";
      const res = await axios.post(`${AI_URL}/similarity`, { text1: q1, text2: q2 }, { params: { threshold: 0.65 } });
      if (res.data.similarity < 0.80) {
        throw new Error(`Expected similarity >= 0.80, got ${res.data.similarity}`);
      }
      return `Similarity: ${(res.data.similarity * 100).toFixed(1)}% (Threshold >= 65% Met: ${res.data.threshold_met})`;
    }
  },
  {
    name: '3. Multilingual Semantic Similarity: English vs Hinglish',
    fn: async () => {
      const q1 = "Give me a roadmap for DSA.";
      const q2 = "DSA ka roadmap kaise banau?";
      const res = await axios.post(`${AI_URL}/similarity`, { text1: q1, text2: q2 }, { params: { threshold: 0.65 } });
      if (res.data.similarity < 0.80) {
        throw new Error(`Expected similarity >= 0.80, got ${res.data.similarity}`);
      }
      return `Similarity: ${(res.data.similarity * 100).toFixed(1)}% (Threshold >= 65% Met: ${res.data.threshold_met})`;
    }
  },
  {
    name: '4. Semantic Discrimination: DSA vs Canteen Query',
    fn: async () => {
      const q1 = "How should I start learning DSA?";
      const q2 = "कॉलेज कॅन्टीनचे जेवण कसे आहे?";
      const res = await axios.post(`${AI_URL}/similarity`, { text1: q1, text2: q2 }, { params: { threshold: 0.65 } });
      if (res.data.similarity > 0.40) {
        throw new Error(`Expected similarity < 0.40, got ${res.data.similarity}`);
      }
      return `Similarity: ${(res.data.similarity * 100).toFixed(1)}% (Correctly discriminated as unrelated)`;
    }
  },
  {
    name: '5. Admin Authentication: Rejection of Invalid Credentials',
    fn: async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/auth/login`, {
          email: 'admin@clusterai.org',
          password: 'WrongPassword999!'
        });
        throw new Error('Expected 401 Unauthorized for invalid credentials');
      } catch (err) {
        if (err.response && err.response.status === 401) {
          return 'Correctly rejected with 401 Unauthorized';
        }
        throw err;
      }
    }
  },
  {
    name: '6. Admin Authentication: Successful Login & JWT Token',
    fn: async () => {
      const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: 'admin@clusterai.org',
        password: 'Admin@12345'
      });
      if (!res.data.success || !res.data.token) {
        throw new Error('Failed to retrieve valid JWT token on login');
      }
      authToken = res.data.token;
      return `Authenticated as: ${res.data.admin.name} (${res.data.admin.email})`;
    }
  },
  {
    name: '7. Input Validation: Reject Empty Question',
    fn: async () => {
      try {
        await axios.post(`${BACKEND_URL}/api/questions/submit`, { text: '   ' });
        throw new Error('Expected 400 for empty question text');
      } catch (err) {
        if (err.response && err.response.status === 400) {
          return 'Correctly rejected empty submission with 400 Bad Request';
        }
        throw err;
      }
    }
  },
  {
    name: '8. End-to-End Submission & Incremental Cluster Assignment',
    fn: async () => {
      const res1 = await axios.post(`${BACKEND_URL}/api/questions/submit`, {
        text: 'How should I start learning DSA and algorithms?',
        language: 'en'
      });
      if (!res1.data.success) throw new Error('Submission 1 failed');
      testClusterId = res1.data.cluster.id;
      testQuestionId = res1.data.question.id;

      // Submit Marathi equivalent: should join the same cluster!
      const res2 = await axios.post(`${BACKEND_URL}/api/questions/submit`, {
        text: 'मला DSA शिकायला सुरुवात कशी करावी?',
        language: 'mr'
      });
      if (!res2.data.success) throw new Error('Submission 2 failed');

      const clusterAction = res2.data.cluster.action;
      return `Q1 created/assigned cluster "${res1.data.cluster.title}". Q2 (Marathi) assigned: ${clusterAction} (Cluster Count: ${res2.data.cluster.questionCount})`;
    }
  },
  {
    name: '9. Ranked Clusters & Topic Demand Analytics',
    fn: async () => {
      const res = await axios.get(`${BACKEND_URL}/api/clusters`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.data.success) throw new Error('Failed to fetch ranked clusters');
      const count = res.data.clusters.length;
      const top = res.data.clusters[0];
      return `Fetched ${count} clusters. Top Topic: #${top?.clusterNumber} "${top?.title}" with ${top?.questionCount} inquiries.`;
    }
  },
  {
    name: '10. Admin Operations: Edit Topic Title',
    fn: async () => {
      if (!testClusterId) return 'Skipped (no test cluster)';
      const res = await axios.patch(
        `${BACKEND_URL}/api/clusters/${testClusterId}/title`,
        { title: 'Data Structures & Algorithms (DSA) Roadmap' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (!res.data.success) throw new Error('Failed to update title');
      return `Updated title: "${res.data.cluster.title}"`;
    }
  },
  {
    name: '11. QR Code Generation for Public Submission Form',
    fn: async () => {
      const res = await axios.get(`${BACKEND_URL}/api/stats/qr`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.data.success || !res.data.qrDataUrl) {
        throw new Error('Failed to generate QR data URL');
      }
      return `Generated PNG Data URL for: ${res.data.publicUrl} (Length: ${res.data.qrDataUrl.length} chars)`;
    }
  }
];

async function runTestSuite() {
  console.log('='.repeat(75));
  console.log('   RUNNING AUTOMATED MULTILINGUAL SYSTEM INTEGRATION TESTS');
  console.log('='.repeat(75));

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    process.stdout.write(`• ${t.name}... `);
    try {
      const info = await t.fn();
      console.log(`\x1b[32mPASSED\x1b[0m`);
      if (info) console.log(`    ↳ ${info}`);
      passed++;
    } catch (err) {
      console.log(`\x1b[31mFAILED\x1b[0m`);
      console.log(`    ↳ Error: ${err.message}`);
      failed++;
    }
  }

  console.log('='.repeat(75));
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('='.repeat(75));

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
