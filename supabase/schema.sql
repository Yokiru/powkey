create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'reseller' check (role in ('admin', 'reseller')),
  is_approved boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.profiles (id, email, full_name, role, is_approved, is_active)
select
  u.id,
  u.email,
  coalesce(rp.full_name, u.raw_user_meta_data ->> 'full_name'),
  'reseller',
  false,
  coalesce(rp.is_active, true)
from auth.users u
left join public.reseller_profiles rp on rp.id = u.id
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);

update public.profiles p
set
  email = u.email,
  full_name = coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name')
from auth.users u
where p.id = u.id;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  require_email boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  slug text not null,
  label text not null,
  retail_price integer not null check (retail_price >= 0),
  reseller_price integer not null check (reseller_price >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (product_id, slug)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  public_token uuid not null unique default gen_random_uuid(),
  buyer_tier text not null check (buyer_tier in ('retail', 'reseller')),
  reseller_id uuid references auth.users (id) on delete set null,
  product_id uuid not null references public.products (id),
  product_variant_id uuid not null references public.product_variants (id),
  unit_price integer not null check (unit_price >= 0),
  qty integer not null check (qty >= 1),
  total integer not null check (total >= 0),
  customer_name text not null,
  customer_whatsapp text not null,
  customer_email text,
  customer_note text,
  status text not null default 'waiting' check (status in ('waiting', 'process', 'success')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_credentials (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  slot_number integer not null check (slot_number >= 1),
  label text,
  email text,
  link text,
  password text,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (order_id, slot_number)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists set_updated_at_on_profiles on public.profiles;
create trigger set_updated_at_on_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_products on public.products;
create trigger set_updated_at_on_products
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_product_variants on public.product_variants;
create trigger set_updated_at_on_product_variants
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_orders on public.orders;
create trigger set_updated_at_on_orders
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_on_order_credentials on public.order_credentials;
create trigger set_updated_at_on_order_credentials
before update on public.order_credentials
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_credentials enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "users can update own full name" on public.profiles;
create policy "users can update own full name"
on public.profiles
for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and is_approved = (select p.is_approved from public.profiles p where p.id = auth.uid())
  and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
);

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products
for select
using (is_active = true);

drop policy if exists "public can read active variants" on public.product_variants;
create policy "public can read active variants"
on public.product_variants
for select
using (is_active = true);

drop policy if exists "reseller can read own orders" on public.orders;
create policy "reseller can read own orders"
on public.orders
for select
using (
  buyer_tier = 'reseller'
  and reseller_id = auth.uid()
);

drop policy if exists "reseller can read own credentials" on public.order_credentials;
create policy "reseller can read own credentials"
on public.order_credentials
for select
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_credentials.order_id
      and public.orders.reseller_id = auth.uid()
  )
);

update public.profiles
set
  role = 'admin',
  is_approved = true,
  is_active = true
where lower(email) = 'yosiamanullang@gmail.com';
