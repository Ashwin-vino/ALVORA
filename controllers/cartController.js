/**
 * Cart Controller
 * Handles shopping bag operations including additions, updates, deletions, coupon applications, and checkout rendering.
 */

const supabase = require('../config/supabase');
const { isJsonRequest, throwIfSupabaseError } = require('../utils/databaseHelpers');
const { loadCart, getProduct, addProductToCart } = require('../utils/cartHelpers');

function userId(req) {
  return req.user.id || req.user._id;
}

function getSessionCoupon(req) {
  const coupon = req.session?.cartCoupon;

  if (!coupon || !coupon.code || !Number.isFinite(Number(coupon.discountPercent))) {
    return null;
  }

  return {
    code: coupon.code,
    discountPercent: Number(coupon.discountPercent)
  };
}

function loadUserCart(req) {
  return loadCart(userId(req), getSessionCoupon(req));
}

function invalidCartRequest(req, res, message) {
  if (isJsonRequest(req)) {
    return res.status(400).json({ success: false, message });
  }

  return res.redirect('/cart');
}

// Get Shopping Bag View
exports.getCart = async (req, res, next) => {
  try {
    const cart = await loadUserCart(req);

    res.render('cart', {
      title: 'Shopping Bag | ALVORA MAISON',
      cart
    });
  } catch (error) {
    next(error);
  }
};

// Add Item to Shopping Bag
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, size, color } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    const product = await getProduct(productId);
    if (!product) {
      if (isJsonRequest(req)) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      return res.redirect('back');
    }

    const currentUserId = userId(req);
    await addProductToCart(currentUserId, product, qty, size, color);

    if (isJsonRequest(req)) {
      const cart = await loadCart(currentUserId, getSessionCoupon(req));
      const totalCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
      return res.json({
        success: true,
        message: 'Item added to your shopping bag.',
        cartCount: totalCount
      });
    }

    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// Update Cart Item Quantity
exports.updateQuantity = async (req, res, next) => {
  try {
    const itemId = Number.parseInt(req.body.itemId || req.params.itemId, 10);
    const submittedQuantity = req.body.quantity ?? req.body.qty;
    let qty = Number.parseInt(submittedQuantity, 10);

    if (req.body.action === 'decrease') {
      qty -= 1;
    } else if (req.body.action === 'increase') {
      qty += 1;
    }

    if (!Number.isSafeInteger(itemId) || !Number.isInteger(qty)) {
      return invalidCartRequest(req, res, 'A valid cart item and quantity are required.');
    }

    qty = Math.min(qty, 99);

    const currentUserId = userId(req);
    const { data: item, error } = await supabase
      .from('cart')
      .select('id')
      .eq('id', itemId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    throwIfSupabaseError(error, 'cart item lookup');

    if (item) {
      if (qty <= 0) {
        const { error: deleteError } = await supabase
          .from('cart')
          .delete()
          .eq('id', item.id)
          .eq('user_id', currentUserId);

        throwIfSupabaseError(deleteError, 'cart item removal');
      } else {
        const { error: updateError } = await supabase
          .from('cart')
          .update({ quantity: qty })
          .eq('id', item.id)
          .eq('user_id', currentUserId);

        throwIfSupabaseError(updateError, 'cart item quantity update');
      }
    }

    if (isJsonRequest(req)) {
      const cart = await loadCart(currentUserId, getSessionCoupon(req));
      return res.json({
        success: true,
        message: 'Shopping bag updated.',
        cart
      });
    }

    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// Remove Item from Cart
exports.removeFromCart = async (req, res, next) => {
  try {
    const itemId = Number.parseInt(req.params.itemId || req.body.itemId, 10);

    if (!Number.isSafeInteger(itemId)) {
      return invalidCartRequest(req, res, 'A valid cart item is required.');
    }

    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId(req));

    throwIfSupabaseError(error, 'cart item removal');

    if (isJsonRequest(req)) {
      return res.json({ success: true, message: 'Item removed from bag.' });
    }

    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// Clear Entire Cart
exports.clearCart = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('user_id', userId(req));

    throwIfSupabaseError(error, 'cart clear');

    if (isJsonRequest(req)) {
      return res.json({ success: true, message: 'Shopping bag cleared.' });
    }

    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// Apply Promo / Coupon Code
exports.applyCoupon = async (req, res, next) => {
  try {
    const code = req.body.code || req.body.couponCode;
    const normalizedCode = code ? code.trim().toUpperCase() : '';

    const currentUserId = userId(req);

    let discountPercent = 0;
    if (normalizedCode === 'ALVORA10') {
      discountPercent = 10;
    } else if (normalizedCode === 'MAISON20') {
      discountPercent = 20;
    } else {
      if (isJsonRequest(req)) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
      }
      return res.redirect('/cart');
    }

    req.session.cartCoupon = {
      code: normalizedCode,
      discountPercent
    };

    if (isJsonRequest(req)) {
      return res.json({
        success: true,
        message: 'Promo code applied.',
        cart: await loadCart(currentUserId, getSessionCoupon(req))
      });
    }

    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};

// Buy Now: add selected product to the user's cart and continue to checkout
exports.buyNow = async (req, res, next) => {
  try {
    const { productId, quantity, size, color } = req.body;
    const qty = parseInt(quantity, 10) || 1;

    const product = await getProduct(productId);
    if (!product) {
      return res.redirect('/collection');
    }

    await addProductToCart(userId(req), product, qty, size, color);
    return res.redirect('/cart/checkout');
  } catch (error) {
    next(error);
  }
};

// Get Checkout Page View
exports.getCheckout = async (req, res, next) => {
  try {
    const cart = await loadUserCart(req);

    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    res.render('checkout', {
      title: 'Checkout | ALVORA MAISON',
      cart,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};
