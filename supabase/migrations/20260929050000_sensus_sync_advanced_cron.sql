-- Advanced admin-managed schedules. Existing automation remains off by default.
alter table public.sensus_sync_settings
  add column cron_mode text not null default 'off'
    check (cron_mode in ('off', 'daily', 'every_3_days', 'weekly', 'every_2_weeks', 'custom')),
  add column cron_expression text;

update public.sensus_sync_settings
set cron_mode = case when cron_daily_time is null then 'off' else 'daily' end,
    cron_expression = null;

create or replace function public.sensus_sync_cron_configure(
  p_mode text,
  p_time text default null,
  p_expression text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := public.user_role();
  v_minute int;
  v_hour int;
  v_gmt_hour int;
  v_expr text;
  v_command text;
begin
  if v_role not in ('super_admin', 'admin') then
    raise exception 'Forbidden';
  end if;

  if p_mode not in ('off', 'daily', 'every_3_days', 'weekly', 'every_2_weeks', 'custom') then
    raise exception 'Invalid schedule mode';
  end if;

  if p_mode = 'off' then
    update public.sensus_sync_settings
    set cron_mode = 'off', cron_daily_time = null, cron_expression = null, updated_at = now()
    where id = 1;
    begin perform cron.unschedule('sensus-sync-stage'); exception when others then null; end;
    return jsonb_build_object('cron_enabled', false);
  end if;

  if p_mode = 'custom' then
    if p_expression is null
       or p_expression !~ '^([^[:space:]]+[[:space:]]){4}[^[:space:]]+$'
       or p_expression !~ '^[0-9*/?,#LW-]+[[:space:]][0-9*/?,#LW-]+[[:space:]][0-9*/?,#LW-]+[[:space:]][0-9*/?,#LW-]+[[:space:]][0-9*/?,#LW-]+$'
       or length(p_expression) > 100 then
      raise exception 'Custom cron must use five cron fields';
    end if;
    v_expr := p_expression;
  else
    if p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception 'Time must use HH:MM (WIB)';
    end if;
    v_minute := split_part(p_time, ':', 2)::int;
    v_hour := split_part(p_time, ':', 1)::int;
    v_gmt_hour := (v_hour + 24 - 7) % 24;
    v_expr := v_minute || ' ' || v_gmt_hour || case p_mode
      when 'daily' then ' * * *'
      when 'every_3_days' then ' * * *'
      when 'weekly' then ' * * 0'
      when 'every_2_weeks' then ' * * 0'
    end;
  end if;

  update public.sensus_sync_settings
  set cron_mode = p_mode,
      cron_daily_time = case when p_mode = 'custom' then null else p_time end,
      cron_expression = case when p_mode = 'custom' then p_expression else null end,
      updated_at = now()
  where id = 1;

  begin perform cron.unschedule('sensus-sync-stage'); exception when others then null; end;
  v_command := $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'sensus_sync_project_url') || '/functions/v1/sensus-sync',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sensus_sync_bearer')),
      body := '{"action":"stage"}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$;
  if p_mode = 'every_3_days' then
    v_command := 'select case when (current_date - date ''2024-01-01'') % 3 = 0 then ('
      || replace(v_command, ';', '') || ') end;';
  elsif p_mode = 'every_2_weeks' then
    v_command := 'select case when ((current_date - date ''2024-01-07'') / 7) % 2 = 0 then ('
      || replace(v_command, ';', '') || ') end;';
  end if;

  perform cron.schedule(
    'sensus-sync-stage', v_expr,
    v_command
  );
  return jsonb_build_object('cron_enabled', true, 'schedule', v_expr);
end;
$$;

drop function public.sensus_sync_cron_configure(text);
revoke all on function public.sensus_sync_cron_configure(text, text, text) from public, anon;
grant execute on function public.sensus_sync_cron_configure(text, text, text) to authenticated;
