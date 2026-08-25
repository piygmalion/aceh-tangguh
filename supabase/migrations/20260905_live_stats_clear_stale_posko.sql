-- Match live: posko_count is nullable with no default (NULL, not 0).
-- 656 was a stale seed, not a counted inventory — do not invent a replacement.
-- Idempotent if live already ALTERed the column and set id=1 to NULL.

alter table public.live_stats
  alter column posko_count drop not null;

alter table public.live_stats
  alter column posko_count drop default;

update public.live_stats
  set posko_count = null, updated_at = now()
  where posko_count = 656;
