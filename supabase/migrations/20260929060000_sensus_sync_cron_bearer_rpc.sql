-- Cron identity check, evaluated where the secret lives.
-- The Edge Function authenticates to the DB with its env service key, but the
-- vault-stored cron bearer (sensus_sync_bearer) may be a different valid
-- service key string (legacy JWT vs new sb_secret format). Comparing inside
-- the DB keeps the bearer out of the repo and lets the two differ safely.
-- Service_role-only: the function's admin client is the sole caller.
create or replace function public.sensus_sync_is_cron_bearer(p_token text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select p_token is not null
     and p_token = (select decrypted_secret from vault.decrypted_secrets
                    where name = 'sensus_sync_bearer')
$$;

revoke all on function public.sensus_sync_is_cron_bearer(text) from public, anon, authenticated;
grant execute on function public.sensus_sync_is_cron_bearer(text) to service_role;
