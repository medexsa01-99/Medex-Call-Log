-- Keep audit_log from filling the database (it's what filled the old project:
-- 1.7 GB of audit history). Keep only the last 30 days and prune daily via pg_cron.
-- Run once in the NEW project's SQL Editor.

create extension if not exists pg_cron;

-- Clear anything already older than 30 days right now.
delete from public.audit_log where created_at < now() - interval '30 days';

-- Remove an existing job of the same name (so this is safe to re-run).
select cron.unschedule('audit-log-cleanup-30d')
where exists (select 1 from cron.job where jobname = 'audit-log-cleanup-30d');

-- Prune daily at 03:30.
select cron.schedule(
  'audit-log-cleanup-30d',
  '30 3 * * *',
  $$delete from public.audit_log where created_at < now() - interval '30 days'$$
);
