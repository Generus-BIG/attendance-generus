create table public.lupg_program_analytics_shares (
  id uuid primary key default gen_random_uuid(),
  month date not null check (extract(day from month) = 1),
  token text not null default replace(gen_random_uuid()::text, '-', '')
    check (token ~ '^[0-9a-f]{32}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (month),
  unique (token)
);

comment on table public.lupg_program_analytics_shares is
  'Desa-only public capability links for month-scoped LUPG program analytics.';

alter table public.lupg_program_analytics_shares enable row level security;

create policy lupg_program_analytics_shares_select
  on public.lupg_program_analytics_shares
  for select to authenticated
  using ((select public.user_role()) in ('super_admin', 'admin'));

create policy lupg_program_analytics_shares_insert
  on public.lupg_program_analytics_shares
  for insert to authenticated
  with check ((select public.user_role()) in ('super_admin', 'admin'));

create policy lupg_program_analytics_shares_update
  on public.lupg_program_analytics_shares
  for update to authenticated
  using ((select public.user_role()) in ('super_admin', 'admin'))
  with check ((select public.user_role()) in ('super_admin', 'admin'));

revoke all on table public.lupg_program_analytics_shares from public, anon, authenticated;
grant select on table public.lupg_program_analytics_shares to authenticated;
grant insert (month, is_active) on table public.lupg_program_analytics_shares to authenticated;
grant update (is_active) on table public.lupg_program_analytics_shares to authenticated;

create or replace function public.rotate_lupg_program_analytics_share(p_share_id uuid)
returns public.lupg_program_analytics_shares
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  rotated public.lupg_program_analytics_shares%rowtype;
begin
  if coalesce(public.user_role(), '') not in ('super_admin', 'admin') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.lupg_program_analytics_shares share_row
  set token = replace(gen_random_uuid()::text, '-', '')
  where share_row.id = p_share_id
  returning share_row.* into rotated;

  if rotated.id is null then
    raise exception 'Share not found' using errcode = 'P0002';
  end if;
  return rotated;
end;
$function$;

revoke all on function public.rotate_lupg_program_analytics_share(uuid) from public, anon;
grant execute on function public.rotate_lupg_program_analytics_share(uuid) to authenticated;

create or replace function public.get_public_lupg_program_analytics_payload(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  share_row public.lupg_program_analytics_shares%rowtype;
  share_year integer;
  previous_month date;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select share.* into share_row
  from public.lupg_program_analytics_shares share
  where share.token = p_token and share.is_active = true
  limit 1;

  if share_row.id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  share_year := extract(year from share_row.month)::integer;
  previous_month := (share_row.month - interval '1 month')::date;

  return (
    with groups as (
      select
        lv.id,
        lv.value,
        'group-' || row_number() over (order by lv.value, lv.id)::text as group_key
      from public.lookup_values lv
      where lv.type = 'GROUP'
    ),
    submitted_reports as (
      select mr.id, mr.month, mr.kelompok_id, g.group_key, g.value as kelompok_name
      from public.lupg_monthly_reports mr
      join groups g on g.id = mr.kelompok_id
      where mr.status = 'submitted'
        and (
          (mr.month >= make_date(share_year, 1, 1)
            and mr.month < make_date(share_year + 1, 1, 1))
          or mr.month = previous_month
        )
    ),
    program_items as (
      select row_number() over (order by item.sort_order, item.name)::integer as item_index,
        item.id, item.name, item.sort_order
      from public.lupg_sarpras_items item
      where item.active = true
    )
    select jsonb_build_object(
      'status', 'ok',
      'share', jsonb_build_object('monthKey', to_char(share_row.month, 'YYYY-MM')),
      'data', jsonb_build_object(
        'kelompoks', coalesce((
          select jsonb_agg(jsonb_build_object('key', g.group_key, 'name', g.value) order by g.value)
          from groups g
        ), '[]'::jsonb),
        'reports', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kelompokKey', report.group_key,
            'monthKey', to_char(report.month, 'YYYY-MM'),
            'status', 'submitted'
          ) order by report.month, report.group_key)
          from submitted_reports report
        ), '[]'::jsonb),
        'programs', coalesce((
          select jsonb_agg(jsonb_build_object('code', definition.code, 'name', definition.name) order by definition.sort_order)
          from public.lupg_program_definitions definition
          where definition.active = true
        ), '[]'::jsonb),
        'programValues', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kelompokKey', report.group_key,
            'monthKey', to_char(report.month, 'YYYY-MM'),
            'code', program.program_code,
            'count', program.count_this_month,
            'denominator', program.denominator
          ) order by report.month, report.group_key, program.program_code)
          from submitted_reports report
          join public.lupg_program_reports program on program.monthly_report_id = report.id
        ), '[]'::jsonb),
        'metricValues', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kelompokKey', report.group_key,
            'monthKey', to_char(report.month, 'YYYY-MM'),
            'code', metric.metric_code,
            'value', metric.current_value
          ) order by report.month, report.group_key, metric.metric_code)
          from submitted_reports report
          join public.lupg_metric_reports metric on metric.monthly_report_id = report.id
          where report.month in (share_row.month, previous_month)
        ), '[]'::jsonb),
        'sarprasItems', coalesce((
          select jsonb_agg(jsonb_build_object('index', item.item_index, 'name', item.name) order by item.item_index)
          from program_items item
        ), '[]'::jsonb),
        'sarprasValues', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kelompokKey', report.group_key,
            'monthKey', to_char(report.month, 'YYYY-MM'),
            'itemIndex', item.item_index,
            'fulfilled', sarpras.is_fulfilled
          ) order by report.group_key, item.item_index)
          from submitted_reports report
          join public.lupg_sarpras_reports sarpras on sarpras.monthly_report_id = report.id
          join program_items item on item.id = sarpras.item_id
          where report.month = share_row.month
        ), '[]'::jsonb),
        'shodaqohValues', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kelompokKey', report.group_key,
            'monthKey', to_char(report.month, 'YYYY-MM'),
            'nominal', shodaqoh.nominal
          ) order by report.month, report.group_key)
          from submitted_reports report
          join public.lupg_shodaqoh shodaqoh on shodaqoh.monthly_report_id = report.id
          where report.month in (share_row.month, previous_month)
        ), '[]'::jsonb),
        'sensus', coalesce((
          select jsonb_agg(jsonb_build_object('category', current_sensus.category_code, 'count', current_sensus.total_count) order by current_sensus.category_code)
          from (
            select sensus.category_code, sum(sensus.count)::integer as total_count
            from public.lupg_sensus sensus
            join groups g on g.id = sensus.kelompok_id
            group by sensus.category_code
          ) current_sensus
        ), '[]'::jsonb),
        'mustinNotes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kelompokKey', report.group_key,
            'monthKey', to_char(report.month, 'YYYY-MM'),
            'pokokMasalah', note.pokok_masalah,
            'keputusanRencana', note.keputusan_rencana,
            'status', note.status,
            'sortOrder', note.sort_order
          ) order by report.group_key, note.sort_order)
          from submitted_reports report
          join public.lupg_mustin_notes note on note.monthly_report_id = report.id
          where report.month = share_row.month
        ), '[]'::jsonb),
        'documentation', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kelompokKey', report.group_key,
            'monthKey', to_char(report.month, 'YYYY-MM'),
            'caption', photo.caption,
            'sortOrder', photo.sort_order
          ) order by report.group_key, photo.sort_order, photo.id)
          from submitted_reports report
          join public.lupg_activity_photos photo on photo.report_id = report.id
          where report.month = share_row.month
        ), '[]'::jsonb)
      )
    )
  );
end;
$function$;

revoke all on function public.get_public_lupg_program_analytics_payload(text) from public;
grant execute on function public.get_public_lupg_program_analytics_payload(text) to anon;

create or replace function public.get_public_lupg_program_analytics_photo_paths(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  share_row public.lupg_program_analytics_shares%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return '[]'::jsonb;
  end if;
  select share.* into share_row
  from public.lupg_program_analytics_shares share
  where share.token = p_token and share.is_active = true
  limit 1;
  if share_row.id is null then
    return '[]'::jsonb;
  end if;
  return coalesce((
    with groups as (
      select lv.id, lv.value,
        'group-' || row_number() over (order by lv.value, lv.id)::text as group_key
      from public.lookup_values lv where lv.type = 'GROUP'
    ),
    submitted_reports as (
      select mr.id, mr.month, g.group_key
      from public.lupg_monthly_reports mr
      join groups g on g.id = mr.kelompok_id
      where mr.month = share_row.month and mr.status = 'submitted'
    )
    select jsonb_agg(jsonb_build_object(
      'kelompokKey', report.group_key,
      'monthKey', to_char(report.month, 'YYYY-MM'),
      'sortOrder', photo.sort_order,
      'storagePath', photo.storage_path
    ) order by report.group_key, photo.sort_order, photo.id)
    from submitted_reports report
    join public.lupg_activity_photos photo on photo.report_id = report.id
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.get_public_lupg_program_analytics_photo_paths(text) from public, anon, authenticated;
grant execute on function public.get_public_lupg_program_analytics_photo_paths(text) to service_role;
