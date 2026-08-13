const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const isLoggedIn = require('../middleware/isLoggedIn');

// All order operations require authentication
router.use(isLoggedIn);

// View User Order History
router.get('/', orderController.getUserOrders);

// View Payment Failure Page
router.get('/payment-failed', orderController.getPaymentFailed);

// Place New Order
router.post('/place', orderController.placeOrder);

module.exports = router;