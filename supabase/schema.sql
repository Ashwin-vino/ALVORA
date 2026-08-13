-- Run this file in the Supabase SQL Editor before starting ALVORA.
-- The Express server uses the service-role key; never expose that key to browser code.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_id text unique,
  name text not null default '',
  display_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  email text not null unique,
  avatar text not null default '',
  phone text not null default '',
  address jsonb not null default '{}'::jsonb,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  brand text not null default 'ALVORA',
  collection_name text not null default 'ALVORA MAISON',
  description text not null,
  category text not null check (category in ('men', 'women', 'kids', 'footwear', 'accessories')),
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  images text[] not null default '{}',
  sizes text[] not null default '{}',
  colors jsonb not null default '[]'::jsonb,
  material text not null default '100% Premium Fabric',
  care_instructions text not null default 'Dry clean only.',
  stock integer not null default 1 check (stock >= 0),
  is_featured boolean not null default false,
  is_new_arrival boolean not null default true,
  is_trending boolean not null default false,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- Cart metadata preserves the coupon field that exists in the current Cart model.
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  coupon_code text,
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity >= 1),
  size text not null default 'M',
  color text not null default 'Standard',
  price numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, size, color)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  phone text not null,
  order_items jsonb not null default '[]'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  payment_method text not null default 'Credit Card / Online',
  payment_status text not null default 'Failed' check (payment_status in ('Pending', 'Completed', 'Failed', 'Refunded')),
  order_status text not null default 'Processing' check (order_status in ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Server-side session table for express-session persistence.
create table if not exists public.sessions (
  sid text primary key,
  session_data jsonb not null,
  expires_at timestamptz not null
);

create index if not exists products_category_created_at_idx on public.products (category, created_at desc);
create index if not exists products_price_idx on public.products (price);
create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists cart_items_user_id_idx on public.cart_items (user_id);
create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.favorites enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
on public.users for select to authenticated
using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
on public.users for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Public products are readable" on public.products;
create policy "Public products are readable"
on public.products for select to anon, authenticated
using (true);

drop policy if exists "Users can manage their own favorites" on public.favorites;
create policy "Users can manage their own favorites"
on public.favorites for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their own cart" on public.carts;
create policy "Users can manage their own cart"
on public.carts for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their own cart items" on public.cart_items;
create policy "Users can manage their own cart items"
on public.cart_items for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can manage their own orders" on public.orders;
create policy "Users can manage their own orders"
on public.orders for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- There are intentionally no browser-facing policies for sessions or product writes.
-- Those operations run only through the server-side service-role client.
