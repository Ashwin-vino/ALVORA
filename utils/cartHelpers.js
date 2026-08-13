const supabase = require('../config/supabase');
const { throwIfSupabaseError } = require('./databaseHelpers');
const { mapCart, mapProduct } = require('./databaseMappers');

async function loadCart(userId, coupon = null) {
    const { data: items, error } = await supabase
        .from('cart')
        .select('*, products (*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    throwIfSupabaseError(error, 'cart lookup');

    // The deployed database stores only cart line items. Coupon state is kept in
    // the authenticated server session instead of querying a non-existent carts table.
    return mapCart({
        user_id: userId,
        coupon_code: coupon?.code || null,
        discount_percent: coupon?.discountPercent || 0
    }, items || []);
}

async function getProduct(productId) {
    const normalizedId = Number.parseInt(productId, 10);
    if (!Number.isSafeInteger(normalizedId) || String(normalizedId) !== String(productId).trim()) {
        return null;
    }

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', normalizedId)
        .maybeSingle();

    throwIfSupabaseError(error, 'product lookup');

    return mapProduct(data);
}

async function addProductToCart(userId, product, quantity) {
    const safeQuantity = Math.min(
        Math.max(Number.parseInt(quantity, 10) || 1, 1),
        99
    );

    const { data: existingItems, error: lookupError } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .order('created_at', { ascending: true })
        .limit(1);

    throwIfSupabaseError(lookupError, 'cart item lookup');
    const existingItem = existingItems && existingItems[0];

    if (existingItem) {
        const { data: updatedItem, error } = await supabase
            .from('cart')
            .update({
                quantity: Math.min(existingItem.quantity + safeQuantity, 99)
            })
            .eq('id', existingItem.id)
            .eq('user_id', userId)
            .select()
            .single();

        throwIfSupabaseError(error, 'cart item update');

        return {
            cart: updatedItem,
            item: updatedItem
        };
    }

    const { data: item, error } = await supabase
        .from('cart')
        .insert({
            user_id: userId,
            product_id: product.id,
            quantity: safeQuantity
        })
        .select()
        .single();

    throwIfSupabaseError(error, 'cart item creation');

    return {
        cart: item,
        item
    };
}

module.exports = {
    loadCart,
    getProduct,
    addProductToCart
};
