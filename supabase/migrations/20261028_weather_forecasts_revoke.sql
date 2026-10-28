-- BE-82. Idempotent: repeating this revoke does not error.
-- Not applied to the live database from this ticket.

revoke truncate, references, trigger on table public.weather_forecasts from anon, authenticated;

-- rollback:
-- grant truncate, references, trigger on table public.weather_forecasts to anon, authenticated;
