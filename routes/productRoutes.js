const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// All Products / Collection Route
router.get('/', productController.getCollection);

// Search Products Route
router.get('/search', productController.searchProducts);

// Category Specific Routes
router.get('/category/men', productController.getMenProducts);
router.get('/category/women', productController.getWomenProducts);
router.get('/category/kids', productController.getKidsProducts);
router.get('/category/footwear', productController.getFootwearProducts);

// Single Product Detail Route (by Slug)
router.get('/:slug', productController.getProductDetails);

module.exports = router;