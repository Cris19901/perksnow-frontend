-- Schedule weekly R2 orphan cleanup via pg_cron + pg_net
-- Runs every Sunday at 03:00 UTC

CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove old schedule if it exists so this migration is idempotent
SELECT cron.unschedule('cleanup-r2-storage-weekly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-r2-storage-weekly'
);

SELECT cron.schedule(
  'cleanup-r2-storage-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/cleanup-r2-storage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
