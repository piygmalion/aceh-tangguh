-- Curated public FAQ for the Panduan bot, plus staff-only unknown-intent log.
-- Anon may insert sanitized unknown rows (no PII columns). Anon cannot read the log.

create table if not exists public.panduan_faq (
  id uuid primary key default gen_random_uuid(),
  pola text not null,
  intent text not null,
  body_id text not null,
  body_en text not null,
  href text not null,
  hash text,
  label_key text not null default 'linkSumber',
  published boolean not null default true,
  urutan int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists panduan_faq_published_urutan_idx
  on public.panduan_faq (published, urutan);

create table if not exists public.panduan_unknown (
  id uuid primary key default gen_random_uuid(),
  query_sanitized text not null,
  locale text not null default 'id',
  reason text not null default 'low_confidence',
  pathname text not null default '/',
  created_at timestamptz not null default now()
);

create index if not exists panduan_unknown_created_at_idx
  on public.panduan_unknown (created_at desc);

alter table public.panduan_faq enable row level security;
alter table public.panduan_unknown enable row level security;

drop policy if exists panduan_faq_select_public on public.panduan_faq;
create policy panduan_faq_select_public on public.panduan_faq
  for select to anon, authenticated
  using (published = true or public.is_staff());

drop policy if exists panduan_faq_write_staff on public.panduan_faq;
create policy panduan_faq_write_staff on public.panduan_faq
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists panduan_unknown_insert_anon on public.panduan_unknown;
create policy panduan_unknown_insert_anon on public.panduan_unknown
  for insert to anon, authenticated
  with check (
    char_length(query_sanitized) <= 160
    and char_length(pathname) <= 80
  );

drop policy if exists panduan_unknown_select_staff on public.panduan_unknown;
create policy panduan_unknown_select_staff on public.panduan_unknown
  for select to authenticated
  using (public.is_staff());

drop policy if exists panduan_unknown_write_staff on public.panduan_unknown;
create policy panduan_unknown_write_staff on public.panduan_unknown
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
