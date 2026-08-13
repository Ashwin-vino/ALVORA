/**
 * Order Controller
 * Handles order placement, simulated payment failure redirection,
 * and order history management.
 */

const supabase = require('../config/supabase');
const { throwIfSupabaseError } = require('../utils/databaseHelpers');
const { loadCart } = require('../utils/cartHelpers');
const { mapOrder } = require('../utils/databaseMappers');

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

// Place Order & Process Simulated Payment
exports.placeOrder = async (req, res, next) => {
  try {
    const fullName =
      req.body.fullName ||
      [req.body.firstName, req.body.lastName].filter(Boolean).join(' ');

    const phone = req.body.phone;
    const street = req.body.street || req.body.address;
    const city = req.body.city;
    const state = req.body.state;
    const country = req.body.country || 'United States';
    const pincode = req.body.pincode || req.body.zipCode;

    if (!fullName || !phone || !street || !city || !state || !country || !pincode) {
      return res.redirect('/cart/checkout');
    }

    const currentUserId = userId(req);
    const cart = await loadCart(currentUserId, getSessionCoupon(req));

    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }

    const orderItems = cart.items.map((item) => ({
      product_id: item.product?.id || item.product?._id,
      price: Number(item.price || item.product?.price || 0),
      quantity: Number(item.quantity || 0)
    }));

    if (orderItems.some((item) => !Number.isSafeInteger(Number(item.product_id)) || item.quantity < 1)) {
      return res.redirect('/cart');
    }

    const subtotal = Number(cart.subtotal || 0);
    const discount = Number(cart.discountAmount || 0);
    const totalAmount = Number(cart.total || subtotal - discount);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: currentUserId,
        phone,
        shipping_address: {
          fullName,
          street,
          city,
          state,
          country,
          pincode
        },
        subtotal,
        discount,
        total_amount: totalAmount,
        payment_method: 'Online payment',
        payment_status: 'Pending',
        order_status: 'Processing',
        status: 'pending'
      })
      .select('id')
      .single();

    throwIfSupabaseError(orderError, 'order creation');

    const { error: itemError } = await supabase
      .from('order_items')
      .insert(orderItems.map((item) => ({
        order_id: order.id,
        ...item
      })));

    if (itemError) {
      // Keep the order and its line items consistent if the second write fails.
      const { error: rollbackError } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id)
        .eq('user_id', currentUserId);

      if (rollbackError) {
        console.error('Supabase order rollback failed:', rollbackError.message);
      }

      throwIfSupabaseError(itemError, 'order item creation');
    }

    return res.redirect(`/orders/payment-failed?order=${encodeURIComponent(order.id)}`);
  } catch (error) {
    next(error);
  }
};

// Render Payment Failed Page
exports.getPaymentFailed = (req, res) => {
  res.render('paymentfailed', {
    title: 'Payment Failed | ALVORA MAISON',
    user: req.user || null,
    reason: req.query.reason || 'Payment processing failed.'
  });
};

// Get User Orders List View
exports.getUserOrders = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items (*, products (*))')
      .eq('user_id', userId(req))
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error, 'order history lookup');

    const orders = (data || []).map(mapOrder);

    res.render('orders', {
      title: 'Order History | ALVORA MAISON',
      user: req.user || null,
      orders
    });
  } catch (error) {
    next(error);
  }
};
