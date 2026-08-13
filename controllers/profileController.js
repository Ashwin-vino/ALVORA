const supabase = require('../config/supabase');
const {
  throwIfSupabaseError,
  isJsonRequest
} = require('../utils/databaseHelpers');
const {
  mapUser,
  mapOrder
} = require('../utils/databaseMappers');

function userId(req) {
  return req.user.id || req.user._id;
}

// Get User Profile
exports.getProfile = async (req, res, next) => {
  try {
    const currentUserId = userId(req);

    const [
      { data: userData, error: userError },
      { data: orderData, error: orderError }
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle(),

      supabase
        .from('orders')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    throwIfSupabaseError(userError, 'profile lookup');
    throwIfSupabaseError(orderError, 'recent order lookup');

    const user = mapUser(userData);
    const recentOrders = (orderData || []).map(mapOrder);

    res.render('profile', {
      title: 'Your Account | ALVORA MAISON',
      user,
      recentOrders
    });

  } catch (error) {
    next(error);
  }
};

// Update User Profile
exports.updateProfile = async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const currentUserId = userId(req);

    if (!fullName) {
      const error = new Error('Your name is required.');
      error.status = 400;
      throw error;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.slice(0, 200)
      })
      .eq('id', currentUserId)
      .select()
      .single();

    throwIfSupabaseError(error, 'profile update');

    const mappedUser = mapUser(data);

    if (isJsonRequest(req)) {
      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: mappedUser
      });
    }

    res.redirect('/profile');

  } catch (error) {
    next(error);
  }
};
