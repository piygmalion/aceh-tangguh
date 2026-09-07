-- Daily Brief staff subscribers + daily snapshot + WhatsApp logs.
-- Not a public OTP list. Not the auth users table. Do not mix with notifikasi_wa.

create table if not exists public.daily_brief_subscribers (
  id uuid primary key default gen_random_uuid(),
  phone_enc text not null,
  name text,
  status text not null default 'active',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_brief_subscribers_status_check
    check (status in ('active', 'inactive', 'unsubscribed'))
);

create unique index if not exists daily_brief_subscribers_phone_enc_uidx
  on public.daily_brief_subscribers (phone_enc);

create index if not exists daily_brief_subscribers_status_idx
  on public.daily_brief_subscribers (status);

create table if not exists public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  brief_date date not null,
  summary jsonb not null,
  sources jsonb not null default '{}'::jsonb,
  whatsapp_enqueued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_briefs_date_unique unique (brief_date)
);

create index if not exists daily_briefs_date_idx
  on public.daily_briefs (brief_date);

create table if not exists public.daily_brief_message_logs (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.daily_brief_subscribers (id),
  brief_id uuid not null references public.daily_briefs (id),
  status text not null default 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint daily_brief_message_logs_status_check
    check (status in ('pending', 'sent', 'failed')),
  constraint daily_brief_message_logs_unique unique (subscriber_id, brief_id)
);

create index if not exists daily_brief_message_logs_brief_idx
  on public.daily_brief_message_logs (brief_id);

alter table public.daily_brief_subscribers enable row level security;
alter table public.daily_briefs enable row level security;
alter table public.daily_brief_message_logs enable row level security;

drop policy if exists daily_briefs_public_select on public.daily_briefs;
create policy daily_briefs_public_select
  on public.daily_briefs
  for select to anon, authenticated
  using (true);

revoke all on public.daily_brief_subscribers from public, anon, authenticated;
revoke all on public.daily_brief_message_logs from public, anon, authenticated;
revoke insert, update, delete on public.daily_briefs from public, anon, authenticated;
grant select on public.daily_briefs to anon, authenticated;
