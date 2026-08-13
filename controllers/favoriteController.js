/**
 * Favorite Controller
 * Handles user wishlist operations including viewing, toggling, removing items, and moving items to cart.
 */

const supabase = require('../config/supabase');
const { isJsonRequest, throwIfSupabaseError } = require('../utils/databaseHelpers');
const { mapProduct } = require('../utils/databaseMappers');
const { addProductToCart, getProduct } = require('../utils/cartHelpers');

function userId(req) {
  return req.user.id || req.user._id;
}

async function getFavoriteCount(userId) {
  const { count, error } = await supabase
    .from('favorites')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  throwIfSupabaseError(error, 'wishlist count lookup');
  return count || 0;
}

// Get Wishlist View
exports.getWishlist = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id, product_id, products (*)')
      .eq('user_id', userId(req))
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error, 'wishlist lookup');
    const wishlist = {
      products: (data || []).map((favorite) => mapProduct(favorite.products)).filter(Boolean)
    };

    res.render('wishlist', {
      title: 'Wishlist | ALVORA MAISON',
      wishlist
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Product in Wishlist (Add / Remove)
exports.toggleFavorite = async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      if (isJsonRequest(req)) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
      }
      return res.redirect('back');
    }

    const currentUserId = userId(req);
    let { data: favorite, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('product_id', productId)
      .maybeSingle();

    throwIfSupabaseError(error, 'wishlist item lookup');

    let isAdded = false;

    if (favorite) {
      ({ error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favorite.id)
        .eq('user_id', currentUserId));

      throwIfSupabaseError(error, 'wishlist item removal');
      isAdded = false;
    } else {
      ({ error } = await supabase
        .from('favorites')
        .insert({ user_id: currentUserId, product_id: productId }));

      throwIfSupabaseError(error, 'wishlist item creation');
      isAdded = true;
    }

    const count = await getFavoriteCount(currentUserId);

    if (isJsonRequest(req)) {
      return res.json({
        success: true,
        isAdded,
        message: isAdded ? 'Saved to your wishlist.' : 'Removed from your wishlist.',
        count
      });
    }

    res.redirect('/wishlist');
  } catch (error) {
    next(error);
  }
};

// Remove Product from Wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const productId = req.params.productId || req.body.productId;

    if (!productId) {
      if (isJsonRequest(req)) {
        return res.status(400).json({ success: false, message: 'Product ID is required.' });
      }
      return res.redirect('/wishlist');
    }

    const currentUserId = userId(req);
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', currentUserId)
      .eq('product_id', productId);

    throwIfSupabaseError(error, 'wishlist item removal');
    const count = await getFavoriteCount(currentUserId);

    if (isJsonRequest(req)) {
      return res.json({
        success: true,
        message: 'Item removed from wishlist.',
        count
      });
    }

    res.redirect('/wishlist');
  } catch (error) {
    next(error);
  }
};

// Move Product from Wishlist to Shopping Cart
exports.moveToCart = async (req, res, next) => {
  try {
    const { productId, size, color } = req.body;

    const product = await getProduct(productId);
    if (!product) {
      if (isJsonRequest(req)) {
        return res.status(404).json({ success: false, message: 'Product not found.' });
      }
      return res.redirect('back');
    }

    const currentUserId = userId(req);
    await addProductToCart(currentUserId, product, 1, size, color);

    // Remove product from Wishlist
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', currentUserId)
      .eq('product_id', productId);

    throwIfSupabaseError(error, 'wishlist item move');
    const wishlistCount = await getFavoriteCount(currentUserId);

    if (isJsonRequest(req)) {
      return res.json({
        success: true,
        message: 'Item moved to shopping bag.',
        wishlistCount
      });
    }

    res.redirect('/cart');
  } catch (error) {
    next(error);
  }
};
