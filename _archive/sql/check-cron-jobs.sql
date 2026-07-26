
-- Check all pg_cron jobs
SELECT jobid, jobname, schedule, command, active FROM cron.job;

-- Check all site_config entries
SELECT config_key, config_value FROM site_config ORDER BY config_key;

