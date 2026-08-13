const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const isLoggedIn = require('../middleware/isLoggedIn');

// All profile routes require authentication
router.use(isLoggedIn);

// View User Profile Page
router.get('/', profileController.getProfile);

// Update Profile & Address Information
router.post('/update', profileController.updateProfile);

module.exports = router;