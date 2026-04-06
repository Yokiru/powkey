# Supabase Base Setup

Setup awal ini disiapkan untuk 2 tier harga, auth reseller email-based, dan akses server-only:

- `retail` untuk pembeli biasa
- `reseller` untuk akun reseller

## Aturan key

Project ini sekarang tidak memakai `NEXT_PUBLIC_SUPABASE_*`.
Semua key Supabase hanya dipakai di server:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Jika targetnya benar-benar ketat, key yang pernah dibagikan sebelumnya sebaiknya dirotasi.

## Model akun

- customer biasa tidak perlu login
- reseller wajib sign up / sign in
- admin memakai akun auth biasa, tapi role diatur ke `admin`

## Kenapa reseller pakai auth server-side

Login reseller sekarang memakai `email + password`.
Hak akses tidak ditentukan oleh auth saja, tapi oleh tabel `profiles`.

1. akun dibuat di `auth.users`
2. trigger membuat row `public.profiles`
3. default role adalah `reseller`
4. default `is_approved = false`
5. admin harus mengubah approval agar reseller bisa melihat harga khusus

Halaman `/reseller` sekarang:

- menampilkan `sign in` dan `sign up`
- jika login tapi belum approved, tampil status menunggu approval
- jika approved, tampil harga reseller
- jika role `admin`, redirect ke `/admin`

## Tabel yang disiapkan

- `profiles`
- `products`
- `product_variants`
- `orders`
- `order_credentials`

## Harga ganda

Harga biasa dan reseller disimpan per varian:

- `retail_price`
- `reseller_price`

## Langkah berikutnya

1. Jalankan `supabase/schema.sql` di SQL Editor Supabase
2. Isi `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`
3. Buat akun admin dengan email `yosiamanullang@gmail.com`
4. Jalankan lagi bagian update admin di SQL jika akun admin baru dibuat setelah inject
5. Daftarkan akun reseller dari halaman `/reseller`
6. Approve reseller dengan update `profiles.is_approved = true`
7. Pindahkan produk dari local storage ke tabel `products` dan `product_variants`
