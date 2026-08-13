/**
 * Admin Controller
 * Manages administrative dashboard, product CRUD operations, inventory control, and order status updates.
 */

const supabase = require('../config/supabase');
const { throwIfSupabaseError } = require('../utils/databaseHelpers');
const { mapProduct, mapOrder } = require('../utils/databaseMappers');

function productIdFromRequest(id) {
  const productId = Number.parseInt(id, 10);
  return Number.isSafeInteger(productId) && String(productId) === String(id)
    ? productId
    : null;
}

function productInput(body) {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || '').trim().toLowerCase();
  const price = Number(body.price);

  if (!name || !description || !category || !Number.isFinite(price) || price < 0) {
    const error = new Error('Name, description, category, and a non-negative price are required.');
    error.status = 400;
    throw error;
  }

  return { name, description, category, price };
}

function uploadedImageUrl(req) {
  return req.files && req.files.length > 0 && req.files[0].path
    ? req.files[0].path
    : null;
}

// Render Admin Dashboard
exports.getDashboard = async (req, res, next) => {
  try {
    const isOgAdmin = req.user && req.user.email && req.user.email.toLowerCase() === 'ashwinvino8@gmail.com';
    const currentUserId = req.user.id || req.user._id;

    let productQuery = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    // Sub-admins can ONLY see their own products
    if (!isOgAdmin) {
        productQuery = productQuery.eq('creator_id', currentUserId);
    }

    const [{ data: productData, error: productError }, { data: orderData, error: orderError }] = await Promise.all([
      productQuery,
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
    ]);

    throwIfSupabaseError(productError, 'admin product listing');
    throwIfSupabaseError(orderError, 'admin order listing');


    const products = (productData || []).map(mapProduct);
    const orders = (orderData || []).map(mapOrder);

    const totalProducts = products.length;
    const totalOrders = orders.length;

    res.render('admin', {
      title: 'Admin Dashboard | ALVORA MAISON',
      user: req.user || null,
      products,
      orders,
      totalProducts,
      totalOrders
    });
  } catch (error) {
    next(error);
  }
};

// Render Add Product Form Page
exports.getAddProduct = (req, res) => {
  res.render('addProduct', {
    title: 'Add New Product | ALVORA Admin',
    user: req.user || null
  });
};

// Create New Product
exports.createProduct = async (req, res, next) => {
  try {
    const payload = productInput(req.body);
    const imageUrl = uploadedImageUrl(req) || String(req.body.imageUrl || '').trim();

    // Add creator_id
    payload.creator_id = req.user.id || req.user._id;

    const { error } = await supabase
      .from('products')
      .insert({
        ...payload,
        ...(imageUrl ? { image_url: imageUrl } : {})
      });

    throwIfSupabaseError(error, 'admin product creation');

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
};

// Render Edit Product Form Page
exports.getEditProduct = async (req, res, next) => {
  try {
    const productId = productIdFromRequest(req.params.id);
    if (!productId) {
      return res.status(404).render('404', { title: 'Product Not Found | ALVORA' });
    }

    const { data: productData, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    throwIfSupabaseError(error, 'admin product lookup');

    if (!productData) {
      return res.status(404).render('404', { title: 'Product Not Found | ALVORA' });
    }

    const product = mapProduct(productData);

    res.render('editProduct', {
      title: `Edit ${product.name} | ALVORA Admin`,
      user: req.user || null,
      product
    });
  } catch (error) {
    next(error);
  }
};

// Update Existing Product
exports.updateProduct = async (req, res, next) => {
  try {
    const productId = productIdFromRequest(req.params.id);
    if (!productId) {
      return res.status(404).render('404', { title: 'Product Not Found | ALVORA' });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    throwIfSupabaseError(lookupError, 'admin product lookup');

    if (!existing) {
      return res.status(404).render('404', { title: 'Product Not Found | ALVORA' });
    }

    const isOgAdmin = req.user.email && req.user.email.toLowerCase() === 'ashwinvino8@gmail.com';
    const currentUserId = req.user.id || req.user._id;
    if (!isOgAdmin && existing.creator_id !== currentUserId) {
      return res.status(403).render('error', { title: '403 - Forbidden | ALVORA', error: { status: 403, message: 'You can only edit products you created.' }});
    }

    const updatePayload = productInput(req.body);
    const imageUrl = uploadedImageUrl(req) || String(req.body.imageUrl || '').trim();
    if (imageUrl) {
      updatePayload.image_url = imageUrl;
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId);

    throwIfSupabaseError(updateError, 'admin product update');

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
};

// Delete Product
exports.deleteProduct = async (req, res, next) => {
  try {
    const productId = productIdFromRequest(req.params.id);
    if (!productId) {
      return res.status(404).render('404', { title: 'Product Not Found | ALVORA' });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('products')
      .select('creator_id')
      .eq('id', productId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).render('404', { title: 'Product Not Found | ALVORA' });
    }

    const isOgAdmin = req.user.email && req.user.email.toLowerCase() === 'ashwinvino8@gmail.com';
    const currentUserId = req.user.id || req.user._id;
    if (!isOgAdmin && existing.creator_id !== currentUserId) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(403).json({ success: false, message: 'You can only delete products you created.' });
      }
      return res.status(403).render('error', { title: '403 - Forbidden | ALVORA', error: { status: 403, message: 'You can only delete products you created.' }});
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    throwIfSupabaseError(error, 'admin product deletion');

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.json({ success: true, message: 'Product successfully deleted.' });
    }

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
};

// Update Order Status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const status = String(req.body.orderStatus || req.body.paymentStatus || req.body.status || '').trim();

    const { data: orderData, error: lookupError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    throwIfSupabaseError(lookupError, 'admin order lookup');

    if (!orderData) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: 'An order status is required.' });
    }

    const updatePayload = { status: status.slice(0, 80) };

    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', req.params.id);

    throwIfSupabaseError(updateError, 'admin order status update');

    const { data: refreshedOrder, error: refreshError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    throwIfSupabaseError(refreshError, 'admin order refresh');

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.json({ success: true, message: 'Order status updated.', order: mapOrder(refreshedOrder) });
    }

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
};
