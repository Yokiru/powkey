insert into public.products (slug, name, description, require_email, is_active)
values
  ('youtube-premium-music', 'YOUTUBE PREMIUM + MUSIC', 'Akun premium digital untuk akses YouTube tanpa iklan dan YouTube Music.', false, true),
  ('spotify-premium', 'SPOTIFY PREMIUM', 'Paket premium Spotify digital dengan beberapa pilihan plan dan durasi.', false, true),
  ('canva-pro', 'CANVA PRO', 'Akses Canva Pro digital untuk kebutuhan desain harian dan pekerjaan kreatif.', false, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  require_email = excluded.require_email,
  is_active = excluded.is_active;

with youtube as (
  select id
  from public.products
  where slug = 'youtube-premium-music'
),
spotify as (
  select id
  from public.products
  where slug = 'spotify-premium'
),
canva as (
  select id
  from public.products
  where slug = 'canva-pro'
)
insert into public.product_variants (
  product_id,
  slug,
  label,
  retail_price,
  reseller_price,
  sort_order,
  is_active
)
values
  ((select id from youtube), 'famhead-1-bulan', 'FamHead 1 Bulan', 7000, 7000, 0, true),
  ((select id from youtube), 'famplan-1-bulan', 'FamPlan 1 Bulan', 3000, 3000, 1, true),
  ((select id from youtube), 'indplan-1-bulan', 'IndPlan 1 Bulan', 7000, 7000, 2, true),
  ((select id from youtube), 'indplan-3-bulan', 'IndPlan 3 Bulan', 18000, 18000, 3, true),
  ((select id from spotify), 'indplan-1-bulan', 'IndPlan 1 Bulan', 22000, 22000, 0, true),
  ((select id from spotify), 'famplan-1-bulan', 'FamPlan 1 Bulan', 17000, 17000, 1, true),
  ((select id from spotify), 'famhead-1-bulan', 'FamHead 1 Bulan', 25000, 25000, 2, true),
  ((select id from canva), '1-bulan', '1 Bulan', 5000, 5000, 0, true),
  ((select id from canva), '3-bulan', '3 Bulan', 12000, 12000, 1, true),
  ((select id from canva), '12-bulan', '12 Bulan', 35000, 35000, 2, true)
on conflict (product_id, slug) do update
set
  label = excluded.label,
  retail_price = excluded.retail_price,
  reseller_price = excluded.reseller_price,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
