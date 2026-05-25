const express = require('express');
const router = express.Router();
const { getDashboardStats, getStudentsList, sendMessage, getPendingStudents, approveStudent, rejectStudent } = require('../controllers/tutor.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/dashboard-stats', getDashboardStats);
router.get('/students', getStudentsList);
router.post('/message', sendMessage);
router.get('/pending-students', getPendingStudents);
router.post('/approve-student/:id', approveStudent);
router.post('/reject-student/:id', rejectStudent);

module.exports = router;
