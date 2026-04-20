const express = require('express');
const router = express.Router();
const { getDashboardStats, getStudentsList, sendMessage } = require('../controllers/tutor.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/dashboard-stats', getDashboardStats);
router.get('/students', getStudentsList);
router.post('/message', sendMessage);

module.exports = router;
