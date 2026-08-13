function withLegacyTimestamps(record) {
  if (!record) {
    return null;
  }

  return {
    ...record,
    _id: record.id,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapUser(record) {
  if (!record) {
    return null;
  }

  const displayName =
    record.full_name || record.email || 'ALVORA Client';

  return {
    ...withLegacyTimestamps(record),
    googleId: null,
    displayName,
    firstName: displayName.split(' ')[0] || '',
    lastName: displayName.split(' ').slice(1).join(' ') || '',
    avatar: record.avatar_url || record.avatar || '',
    address: {},
    name: displayName,
    role: record.role || 'user',
    isAdmin: Boolean(record.is_admin)
  };
}

function mapProduct(record) {
  if (!record) {
    return null;
  }

  const images = Array.isArray(record.images)
    ? record.images
    : record.image_url
      ? [record.image_url]
      : [];

  return {
    ...withLegacyTimestamps(record),
    slug: record.slug || String(record.id),
    collectionName: record.collection_name || 'ALVORA MAISON',
    careInstructions: record.care_instructions || 'Dry clean only.',
    isFeatured: Boolean(record.is_featured),
    isNewArrival: Boolean(record.is_new_arrival),
    isTrending: Boolean(record.is_trending),
    price: Number(record.price || 0),
    stock: record.stock === undefined || record.stock === null
      ? null
      : Number(record.stock),
    images,
    sizes: Array.isArray(record.sizes) ? record.sizes : [],
    colors: Array.isArray(record.colors) ? record.colors : [],
    brand: record.brand || record.collection_name || 'ALVORA',
    fabric: record.material || '100% Premium Fabric',
    care: record.care_instructions || 'Dry clean only.'
  };
}

function mapCartItem(record) {
  const product = mapProduct(record.products || record.product);

  return {
    ...withLegacyTimestamps(record),
    product,
    quantity: Number(record.quantity || 0),
    price: record.price === undefined || record.price === null
      ? Number(product?.price || 0)
      : Number(record.price),
    size: record.size || null,
    color: record.color || null
  };
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function mapCart(cartRecord, itemRecords = []) {
  const items = itemRecords.map(mapCartItem);
  const subtotal = roundCurrency(items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ));
  const discountPercent = Number(
    cartRecord?.discount_percent || cartRecord?.coupon?.discountPercent || 0
  );
  const discountAmount = roundCurrency((subtotal * discountPercent) / 100);

  return {
    ...withLegacyTimestamps(cartRecord || { id: null }),
    user: cartRecord?.user_id,
    items,
    coupon: {
      code: cartRecord?.coupon_code || cartRecord?.coupon?.code || null,
      discountPercent
    },
    subtotal,
    discountAmount,
    total: Math.max(roundCurrency(subtotal - discountAmount), 0)
  };
}

function mapOrder(record) {
  if (!record) {
    return null;
  }

  const orderItems = Array.isArray(record.order_items)
    ? record.order_items.map((item) => {
        const product = mapProduct(item.products || item.product);

        return {
          ...item,
          price: Number(item.price || product?.price || 0),
          quantity: Number(item.quantity || 0),
          product: product || {
            _id: item.product_id,
            name: item.name || 'ALVORA Creation',
            slug: item.slug || String(item.product_id || ''),
            images: item.image ? [item.image] : []
          }
        };
      })
    : [];

  return {
    ...withLegacyTimestamps(record),
    user: record.user_id,
    orderNumber: record.order_number || `ALV-${record.id}`,
    orderItems,
    shippingAddress: record.shipping_address || null,
    paymentMethod: record.payment_method || 'Online payment',
    paymentStatus: record.payment_status || (record.status === 'Payment Failed' ? 'Failed' : record.status),
    orderStatus: record.order_status || record.status || 'Processing',
    subtotal: Number(record.subtotal || record.total_amount || 0),
    discount: Number(record.discount || 0),
    totalAmount: Number(record.total_amount || 0)
  };
}

module.exports = {
  mapUser,
  mapProduct,
  mapCart,
  mapOrder
};
