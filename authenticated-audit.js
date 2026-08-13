const crypto = require('crypto');
const signature = require('cookie-signature');
const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const passport = require('passport');
const supabase = require('./config/supabase');

const auditName = `E2E Audit ${Date.now()}`;
const auditEmail = `e2e-oauth-${Date.now()}@example.invalid`;
let server;
let sessionId;
let createdProductId;
let createdOrderId;
let createdProfileId;
let userId;
const results = [];

function assert(condition, name, detail = '') {
  if (!condition) {
    throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
  }
  results.push(name);
}

async function request(baseUrl, cookie, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...options,
    headers: {
      Cookie: cookie,
      ...(options.headers || {})
    }
  });

  return {
    response,
    body: await response.text()
  };
}

async function main() {
  const { data: adminProfile, error: adminError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', process.env.ADMIN_EMAIL.toLowerCase())
    .maybeSingle();

  if (adminError || !adminProfile) {
    throw new Error('Configured admin profile was not found.');
  }

  userId = adminProfile.id;

  const strategy = passport._strategy('google');
  const fakeGoogleProfile = {
    displayName: 'OAuth Audit Client',
    emails: [{ value: auditEmail }],
    photos: [{ value: 'https://example.invalid/avatar.png' }]
  };

  const firstOAuthUser = await new Promise((resolve, reject) => {
    strategy._verify('audit-access-token', 'audit-refresh-token', fakeGoogleProfile, (error, user) => {
      if (error) return reject(error);
      resolve(user);
    });
  });
  createdProfileId = firstOAuthUser.id;
  assert(Boolean(createdProfileId), 'Passport profile creation');

  const secondOAuthUser = await new Promise((resolve, reject) => {
    strategy._verify('audit-access-token', 'audit-refresh-token', fakeGoogleProfile, (error, user) => {
      if (error) return reject(error);
      resolve(user);
    });
  });
  assert(secondOAuthUser.id === createdProfileId, 'Passport existing-profile lookup');

  sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();
  const sessionData = {
    cookie: {
      originalMaxAge: 7 * 24 * 60 * 60 * 1000,
      expires: expiresAt,
      httpOnly: true,
      path: '/'
    },
    passport: { user: userId }
  };

  const { error: sessionError } = await supabase.from('sessions').insert({
    sid: sessionId,
    session_data: sessionData,
    expires_at: expiresAt
  });
  if (sessionError) throw sessionError;

  const cookie = `connect.sid=s:${signature.sign(sessionId, process.env.SESSION_SECRET)}`;
  server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let result = await request(baseUrl, cookie, '/auth/google');
  assert(
    result.response.status === 302 &&
      /accounts\.google\.com/.test(result.response.headers.get('location') || '') &&
      /[?&]state=/.test(result.response.headers.get('location') || ''),
    'Google login redirect with OAuth state',
    `status=${result.response.status}, location=${result.response.headers.get('location') || ''}`
  );

  result = await request(baseUrl, cookie, '/profile');
  assert(result.response.status === 200 && result.body.includes('Client Profile'), 'Authenticated session and profile route');

  result = await request(baseUrl, cookie, '/products');
  assert(result.response.status === 200 && result.body.includes('Collection'), 'Products route');

  const formHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
  result = await request(baseUrl, cookie, '/admin/add-product', {
    method: 'POST',
    headers: formHeaders,
    body: new URLSearchParams({
      name: auditName,
      description: 'Temporary product used only for the authenticated audit.',
      price: '123.45',
      category: 'women'
    })
  });
  assert(result.response.status === 302 && result.response.headers.get('location') === '/admin', 'Admin add product');

  const { data: createdProduct, error: productLookupError } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('name', auditName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (productLookupError || !createdProduct) throw new Error('Audit product was not created.');
  createdProductId = createdProduct.id;

  result = await request(baseUrl, cookie, `/products/${createdProductId}`);
  assert(result.response.status === 200 && result.body.includes(auditName), 'Product details route');

  result = await request(baseUrl, cookie, `/admin/edit-product/${createdProductId}`);
  assert(result.response.status === 200 && result.body.includes('Edit Creation'), 'Admin edit product form');

  const editedName = `${auditName} Updated`;
  result = await request(baseUrl, cookie, `/admin/edit-product/${createdProductId}`, {
    method: 'POST',
    headers: formHeaders,
    body: new URLSearchParams({
      name: editedName,
      description: 'Updated temporary product used only for the authenticated audit.',
      price: '234.56',
      category: 'footwear'
    })
  });
  assert(result.response.status === 302 && result.response.headers.get('location') === '/admin', 'Admin edit product');

  const { data: editedProduct, error: editedLookupError } = await supabase
    .from('products')
    .select('name, price, category')
    .eq('id', createdProductId)
    .maybeSingle();
  assert(
    !editedLookupError && editedProduct?.name === editedName && Number(editedProduct.price) === 234.56 && editedProduct.category === 'footwear',
    'Admin product edit persisted'
  );

  result = await request(baseUrl, cookie, '/cart/add', {
    method: 'POST',
    headers: formHeaders,
    body: new URLSearchParams({ productId: String(createdProductId), quantity: '2' })
  });
  assert(result.response.status === 302 && result.response.headers.get('location') === '/cart', 'Add to cart');

  result = await request(baseUrl, cookie, '/cart');
  assert(result.response.status === 200 && result.body.includes(editedName) && result.body.includes('469.12'), 'Cart route and line-item total');

  result = await request(baseUrl, cookie, '/wishlist/toggle', {
    method: 'POST',
    headers: { ...formHeaders, Accept: 'application/json' },
    body: new URLSearchParams({ productId: String(createdProductId) })
  });
  const favoritePayload = JSON.parse(result.body);
  assert(result.response.status === 200 && favoritePayload.success && favoritePayload.isAdded, 'Add to favorites');

  result = await request(baseUrl, cookie, '/wishlist');
  assert(result.response.status === 200 && result.body.includes(editedName), 'Favorites route');

  result = await request(baseUrl, cookie, '/cart/coupon', {
    method: 'POST',
    headers: formHeaders,
    body: new URLSearchParams({ code: 'ALVORA10' })
  });
  assert(result.response.status === 302 && result.response.headers.get('location') === '/cart', 'Cart coupon session storage');

  result = await request(baseUrl, cookie, '/cart/checkout');
  assert(result.response.status === 200 && result.body.includes('Checkout') && result.body.includes('422.21'), 'Checkout route and discount total');

  result = await request(baseUrl, cookie, '/orders/place', {
    method: 'POST',
    headers: formHeaders,
    body: new URLSearchParams({
      fullName: 'Audit Client',
      phone: '+15550000000',
      street: '1 Audit Street',
      city: 'Test City',
      state: 'Test State',
      country: 'United States',
      pincode: '12345'
    })
  });
  assert(result.response.status === 302 && result.response.headers.get('location')?.startsWith('/orders/payment-failed?order='), 'Place order and payment failure redirect');

  const { data: createdOrder, error: orderLookupError } = await supabase
    .from('orders')
    .select('id, status, total_amount, order_items (*)')
    .eq('user_id', userId)
    .eq('phone', '+15550000000')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderLookupError || !createdOrder) throw new Error('Audit order was not created.');
  createdOrderId = createdOrder.id;
  assert(
    createdOrder.status === 'pending' &&
      Number(createdOrder.total_amount) === 422.21 &&
      createdOrder.order_items.length === 1,
    'Failed order and order items persisted'
  );

  result = await request(baseUrl, cookie, '/orders/payment-failed');
  assert(result.response.status === 200 && result.body.includes('Payment Failed'), 'Payment failed route');

  result = await request(baseUrl, cookie, '/orders');
  assert(result.response.status === 200 && result.body.includes(editedName), 'Order history route');

  result = await request(baseUrl, cookie, '/admin');
  assert(result.response.status === 200 && result.body.includes(editedName), 'Admin dashboard');

  result = await request(baseUrl, cookie, '/auth/logout');
  assert(result.response.status === 302 && result.response.headers.get('location') === '/', 'Logout');

  result = await request(baseUrl, cookie, '/profile');
  assert(result.response.status === 302 && result.response.headers.get('location') === '/auth/login', 'Session invalidated after logout');

  console.log(JSON.stringify({ passed: results }, null, 2));
}

async function cleanup() {
  if (createdOrderId) {
    await supabase.from('order_items').delete().eq('order_id', createdOrderId);
    await supabase.from('orders').delete().eq('id', createdOrderId);
  }

  if (createdProductId && userId) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('product_id', createdProductId);
    await supabase.from('cart').delete().eq('user_id', userId).eq('product_id', createdProductId);
  }

  if (createdProductId) {
    const { error } = await supabase.from('products').delete().eq('id', createdProductId);
    if (error) throw error;
  }

  if (createdProfileId) {
    await supabase.from('profiles').delete().eq('id', createdProfileId);
  }

  if (sessionId) {
    await supabase.from('sessions').delete().eq('sid', sessionId);
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

main()
  .catch((error) => {
    console.error(`AUTHENTICATED_AUDIT_FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error(`AUTHENTICATED_AUDIT_CLEANUP_FAILED: ${error.message}`);
      process.exitCode = 1;
    }
  });
