-- Requires app.supabase_url and app.service_role_key to be configured as Supabase vault-backed secrets.
SELECT cron.schedule(
  'rentrix-daily-automation',
  '0 2 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.supabase_url') || 
           '/functions/v1/automation-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || 
      current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )$$
);
