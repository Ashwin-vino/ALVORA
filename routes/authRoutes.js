const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');

// Render Login Page
router.get('/login', authController.renderLogin);

// Initiate Google OAuth Authentication
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], state: true })
);

// Google OAuth Callback Handler
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login' }),
  authController.googleCallback
);

// Logout Handlers (Support GET and POST)
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

module.exports = router;
