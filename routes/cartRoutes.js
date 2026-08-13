const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const isLoggedIn = require('../middleware/isLoggedIn');

// All cart operations require user authentication
router.use(isLoggedIn);

// Render Shopping Bag
router.get('/', cartController.getCart);

// Render Checkout View
router.get('/checkout', cartController.getCheckout);

// Add Product to Bag
router.post('/add', cartController.addToCart);

// Buy Now: add item to cart and continue to the existing checkout flow
router.post('/buy-now', cartController.buyNow);

// Update Bag Item Quantity
router.post('/update', cartController.updateQuantity);

// Remove Item from Bag
router.post('/remove/:itemId', cartController.removeFromCart);

// Clear Entire Bag
router.post('/clear', cartController.clearCart);

// Apply Promo / Coupon Code
router.post('/coupon', cartController.applyCoupon);

module.exports = router;