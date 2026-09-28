-- =============================================================================
-- Sensus sync automation: pg_cron schedule + auto-apply pure-new rows
-- =============================================================================

-- Each extension creates its own schema (cron / net).
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Automation flags. app_settings is writable by every authenticated role, so
-- these get a dedicated admin-only table (same RLS pattern as staging tables).
create table public.sensus_sync_settings (
  id integer primary key default 1 check (id = 1),
  auto_apply_new boolean not null default false,
  cron_daily_time text, -- 'HH:MM' WIB; null = cron off
  updated_at timestamptz not null default now()
);

insert into public.sensus_sync_settings (id) values (1) on conflict do nothing;

alter table public.sensus_sync_settings enable row level security;

create policy sensus_sync_settings_admin on public.sensus_sync_settings
  for all to authenticated
  using (public.user_role() in ('super_admin', 'admin'))
  with check (public.user_role() in ('super_admin', 'admin'));

-- Admin-driven schedule control. SECURITY DEFINER because cron.schedule is
-- restricted to the extension owner. Bearer and URL come from Supabase Vault
-- (sensus_sync_bearer / sensus_sync_project_url) so the service role key
-- never appears in this repo.
create or replace function public.sensus_sync_cron_configure(p_daily_time text)
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
begin
  if v_role not in ('super_admin', 'admin') then
    raise exception 'Forbidden';
  end if;

  if p_daily_time is null then
    update public.sensus_sync_settings
    set cron_daily_time = null, updated_at = now()
    where id = 1;

    begin
      perform cron.unschedule('sensus-sync-stage');
    exception when others then
      null; -- job not scheduled yet
    end;
    return jsonb_build_object('cron_enabled', false);
  end if;

  if p_daily_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Format waktu harus HH:MM (WIB)';
  end if;

  v_minute := split_part(p_daily_time, ':', 2)::int;
  v_hour := split_part(p_daily_time, ':', 1)::int;
  -- pg_cron runs in GMT; WIB is UTC+7.
  v_gmt_hour := (v_hour + 24 - 7) % 24;
  v_expr := v_minute || ' ' || v_gmt_hour || ' * * *';

  update public.sensus_sync_settings
  set cron_daily_time = p_daily_time, updated_at = now()
  where id = 1;

  begin
    perform cron.unschedule('sensus-sync-stage');
  exception when others then
    null;
  end;

  perform cron.schedule(
    'sensus-sync-stage',
    v_expr,
    $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets
              where name = 'sensus_sync_project_url')
             || '/functions/v1/sensus-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret
                                       from vault.decrypted_secrets
                                       where name = 'sensus_sync_bearer')
      ),
      body := '{"action":"stage"}'::jsonb,
      timeout_milliseconds := 60000
    );
    $cron$
  );

  return jsonb_build_object('cron_enabled', true, 'schedule', v_expr);
end;
$$;

revoke all on function public.sensus_sync_cron_configure(text) from public, anon;
grant execute on function public.sensus_sync_cron_configure(text) to authenticated;

-- Auto-apply runs inside the Edge Function with the service role key, so the
-- reviewed apply RPC also trusts that server-only caller.
create or replace function public.apply_sensus_sync_items(p_item_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := public.user_role();
  v_id uuid;
  v_item public.sensus_sync_items%ROWTYPE;
  v_category_id uuid;
  v_group_id uuid;
  v_ok integer := 0;
  v_fail integer := 0;
begin
  if v_role not in ('super_admin', 'admin') and current_user <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  foreach v_id in array p_item_ids loop
    begin
      select *
      into v_item
      from public.sensus_sync_items
      where id = v_id
        and status = 'pending'
      for update;

      if not found then
        continue;
      end if;

      select id
      into v_category_id
      from public.lookup_values
      where type = 'CATEGORY'
        and value = v_item.source_kategori;

      if v_category_id is null then
        raise exception 'Unknown category: %', v_item.source_kategori;
      end if;

      if v_item.matched_participant_id is null then
        select id
        into v_group_id
        from public.lookup_values
        where type = 'GROUP'
          and value = v_item.source_kelompok;

        if v_group_id is null then
          raise exception 'Unknown kelompok: %', v_item.source_kelompok;
        end if;

        insert into public.participants (
          name,
          gender,
          group_id,
          category_id,
          status_active,
          birth_date,
          is_khusus
        ) values (
          v_item.source_name,
          v_item.source_gender,
          v_group_id,
          v_category_id,
          true,
          v_item.source_birth_date,
          v_item.source_khusus
        );
      else
        update public.participants
        set birth_date = coalesce(birth_date, v_item.source_birth_date),
            category_id = v_category_id,
            is_khusus = v_item.source_khusus
        where id = v_item.matched_participant_id;

        if not found then
          raise exception 'Matched participant no longer exists: %', v_item.matched_participant_id;
        end if;
      end if;

      update public.sensus_sync_items
      set status = 'applied',
          error = null
      where id = v_id;

      v_ok := v_ok + 1;
    exception when others then
      update public.sensus_sync_items
      set status = 'pending',
          error = sqlerrm
      where id = v_id;

      v_fail := v_fail + 1;
    end;
  end loop;

  return jsonb_build_object('applied', v_ok, 'failed', v_fail);
end;
$$;

revoke all on function public.apply_sensus_sync_items(uuid[]) from public, anon;
grant execute on function public.apply_sensus_sync_items(uuid[]) to authenticated;
