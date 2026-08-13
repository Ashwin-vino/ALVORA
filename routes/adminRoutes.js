const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const isLoggedIn = require('../middleware/isLoggedIn');
const isAdmin = require('../middleware/isAdmin');
const upload = require('../middleware/upload');

// Toggle Admin Mode
router.post('/toggle-mode', isLoggedIn, (req, res) => {
    const safeUser = req.user || {};
    const isOgAdmin = safeUser.email && safeUser.email.toLowerCase() === 'ashwinvino8@gmail.com';
    const isSubAdmin = !isOgAdmin;

    // Only non-owner sub-admins need to toggle. OG Admin is strictly master.
    if (!isSubAdmin) {
        return res.redirect('/admin');
    }

    const selectedMode = req.body.mode;
    
    if (selectedMode === 'admin') {
        req.session.adminMode = true;
        return res.redirect('/admin');
    } else if (selectedMode === 'user') {
        req.session.adminMode = false;
        return res.redirect('/');
    } else {
        // Fallback for legacy toggle or undefined
        req.session.adminMode = !req.session.adminMode;
        return res.redirect(req.session.adminMode ? '/admin' : '/');
    }
});

// Protect all admin endpoints with authentication and admin verification
router.use(isLoggedIn, isAdmin);

// Render Admin Dashboard
router.get('/', adminController.getDashboard);

// Wrapper to handle Cloudinary/Multer errors gracefully
const handleUpload = (req, res, next) => {
    upload.array('images', 5)(req, res, (err) => {
        if (err) {
            console.error('--- UPLOAD ERROR ---', err);
            return res.status(400).render('error', {
                title: 'Upload Error | ALVORA',
                message: err.message,
                error: { status: 400, message: err.message }
            });
        }
        next();
    });
};

// Render Add Product Form & Handle Creation
router.get('/add-product', adminController.getAddProduct);
router.post('/add-product', handleUpload, adminController.createProduct);

// Render Edit Product Form & Handle Updates
router.get('/edit-product/:id', adminController.getEditProduct);
router.post('/edit-product/:id', handleUpload, adminController.updateProduct);

// Handle Product Deletion
router.post('/delete-product/:id', adminController.deleteProduct);

// Handle Order Status Updates
router.post('/order-status/:id', adminController.updateOrderStatus);

module.exports = router;