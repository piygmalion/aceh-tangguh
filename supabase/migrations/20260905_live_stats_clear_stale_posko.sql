-- live_stats.posko_count=656 was a stale seed, not a counted inventory.
-- Do not replace it with another invented number. Live Supabase is also
-- cleared separately by Backend. This migration only stops the repo seed
-- from surviving on already-applied databases.

alter table public.live_stats
  alter column posko_count drop not null;

alter table public.live_stats
  alter column posko_count drop default;

update public.live_stats
  set posko_count = null, updated_at = now()
  where posko_count = 656;
