const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const isLoggedIn = require('../middleware/isLoggedIn');

// All wishlist routes require authentication
router.use(isLoggedIn);

// Render Wishlist Page
router.get('/', favoriteController.getWishlist);

// Toggle Saved Item (Add / Remove)
router.post('/toggle', favoriteController.toggleFavorite);

// Remove Item from Wishlist (supports direct form submit and fetch payloads)
router.post('/remove', favoriteController.removeFromWishlist);
router.post('/remove/:productId', favoriteController.removeFromWishlist);

// Move Wishlist Item to Shopping Bag
router.post('/move-to-cart', favoriteController.moveToCart);

module.exports = router;