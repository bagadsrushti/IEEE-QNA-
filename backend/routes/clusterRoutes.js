const express = require('express');
const router = express.Router();
const {
  getRankedClusters,
  getClusterDetails,
  updateClusterTitle,
  mergeClusters,
  moveQuestion,
  triggerRecluster,
  exportCSV
} = require('../controllers/clusterController');
const { protect } = require('../middleware/authMiddleware');

// Protected admin routes for cluster management
router.get('/', protect, getRankedClusters);
router.get('/export/csv', protect, exportCSV);
router.get('/:id', protect, getClusterDetails);
router.patch('/:id/title', protect, updateClusterTitle);
router.post('/merge', protect, mergeClusters);
router.post('/move-question', protect, moveQuestion);
router.post('/recluster', protect, triggerRecluster);

module.exports = router;
