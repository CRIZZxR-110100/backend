const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academic.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/subject', academicController.createSubject);
router.get('/subjects', academicController.getMySubjects);
router.patch('/subject/:id', academicController.updateSubject);

router.post('/partial', academicController.addPartialGrade);
router.patch('/partial/:id', academicController.updatePartialGrade);

router.post('/task', academicController.createTask);
router.get('/tasks', academicController.getMyTasks);
router.patch('/task/:id', academicController.updateTask);

module.exports = router;
