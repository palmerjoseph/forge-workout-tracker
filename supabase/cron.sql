-- ═══════════════════════════════════════════════════════════════════
-- FORGE cron wiring — run AFTER schema.sql and after deploying the
-- two edge functions. Replace the two placeholders first:
--   iegewntownzguykxtrth   e.g. abcdefghijklm (from the Supabase project URL)
--   <CRON-SECRET>   the same value you set with:
--                   supabase secrets set FORGE_CRON_SECRET=<CRON-SECRET>
-- Idempotent: safe to re-run (unschedules before scheduling).
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reports: daily at 16:00 & 17:00 UTC — the function itself checks
-- "is it 9 AM Sunday / 9 AM on the 1st in America/Los_Angeles" (DST-safe)
-- and the unique report constraint dedupes the double invocation.
select cron.unschedule(jobname) from cron.job where jobname in
  ('forge-reports-16', 'forge-reports-17', 'forge-cleanup');

select cron.schedule(
  'forge-reports-16', '0 16 * * *',
  $$ select net.http_post(
       url := 'https://iegewntownzguykxtrth.supabase.co/functions/v1/forge-reports',
       headers := '{"x-forge-secret": "<CRON-SECRET>", "Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb) $$);

select cron.schedule(
  'forge-reports-17', '0 17 * * *',
  $$ select net.http_post(
       url := 'https://iegewntownzguykxtrth.supabase.co/functions/v1/forge-reports',
       headers := '{"x-forge-secret": "<CRON-SECRET>", "Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb) $$);

-- Retention cleanup: nightly 10:10 UTC (quiet hours in PT)
select cron.schedule(
  'forge-cleanup', '10 10 * * *',
  $$ select net.http_post(
       url := 'https://iegewntownzguykxtrth.supabase.co/functions/v1/forge-cleanup',
       headers := '{"x-forge-secret": "<CRON-SECRET>", "Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb) $$);
