-- BE-80. Cache prakiraan cuaca resmi (BMKG / Open-Meteo).
-- Tidak diterapkan ke basis data hidup dari tiket ini. Tunggu GO pemilik.
--
-- Berkas 20260824_weather_forecasts.sql di repo membuat tabel yang sama
-- (PK kabupaten_kota, expires_at, indeks expires_at, kebijakan SELECT).
-- Pemeriksaan baca-saja 2026-10-28: tabel dan baris migrasi cuaca tidak ada
-- di produksi. Berkas lama tidak disunting. Berkas ini idempoten supaya
-- aman bila 20260824 sudah jalan lebih dulu (urutan timestamp).
-- Jangan menjalankan 20260824 setelah berkas ini: create policy di sana
-- tidak dijaga dan akan gagal bila kebijakan sudah ada.
--
-- Kolom = kunci objek upsert di src/app/api/weather/refresh/route.ts:90-98.
-- upsert() di route tidak mengirim onConflict; PostgREST memakai primary key.
-- scripts/refresh-weather-cache.mjs:44-46 mengirim onConflict "kabupaten_kota".
-- Pembaca main src/lib/weather/service.ts:148 menyeleksi
-- kabupaten_kota, payload, source, fetched_at dan mengurutkan kabupaten_kota.
-- Draf PR #142 (BE-79) menyeleksi payload, source, fetched_at, expires_at
-- lalu menyaring expires_at di proses (cache-read.ts), bukan di SQL.

create table if not exists public.weather_forecasts (
  -- route.ts:91 tulis; service.ts:148 pilih + urut; script :35 dan onConflict :45
  kabupaten_kota text primary key,
  -- route.ts:92 (forecast.adm4 ?? null); script :36. Pembaca tidak menyeleksi.
  adm4_code text,
  -- route.ts:93 tulis; service.ts:148 pilih; script :37
  payload jsonb not null,
  -- route.ts:94 tulis; service.ts:148 pilih; script :38
  source text not null,
  -- route.ts:95 tulis; service.ts:148 pilih; script :39. ISO dari bmkg.ts:126 dan open-meteo.ts:120
  fetched_at timestamptz not null,
  -- route.ts:57 dan :96 (now + 2 jam); script :33 dan :40.
  -- Indeks di bawah untuk predikat expires_at. Pembaca main belum menyaring di SQL.
  expires_at timestamptz not null,
  -- route.ts:97 tulis; script :41. Pembaca tidak menyeleksi.
  updated_at timestamptz not null default now()
);

comment on table public.weather_forecasts is
  'Official BMKG / Open-Meteo cache. GET reads with the anon key. POST /api/weather/refresh writes with the service role.';

create index if not exists weather_forecasts_expires_idx
  on public.weather_forecasts (expires_at);

alter table public.weather_forecasts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'weather_forecasts'
      and policyname = 'weather_forecasts_select'
  ) then
    create policy weather_forecasts_select
      on public.weather_forecasts
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

revoke insert, update, delete on public.weather_forecasts from public, anon, authenticated;
grant select on public.weather_forecasts to anon, authenticated;
grant select, insert, update, delete on public.weather_forecasts to service_role;

-- verification (jangan jalankan dari tiket ini; jalankan setelah GO dan satu refresh):
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'weather_forecasts'
-- order by ordinal_position;
--
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public' and tablename = 'weather_forecasts';
--
-- select policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public' and tablename = 'weather_forecasts';
--
-- select count(*) as rows, min(expires_at) as expires_min, max(expires_at) as expires_max
-- from public.weather_forecasts;

-- rollback (jangan jalankan dari tiket ini):
-- drop policy if exists weather_forecasts_select on public.weather_forecasts;
-- drop table if exists public.weather_forecasts;
