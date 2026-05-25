const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getMyMessages, joinTutor, subscribeToNotifications } = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware); // Protege todas las rutas debajo

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/messages', getMyMessages);
router.post('/join-tutor', joinTutor);
router.post('/notifications/subscribe', subscribeToNotifications);

module.exports = router;
