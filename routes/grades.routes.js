const express = require('express');
const router = express.Router();
const { getMyGrades, addOrUpdateGrade } = require('../controllers/grades.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', getMyGrades);
router.post('/', addOrUpdateGrade);

module.exports = router;
