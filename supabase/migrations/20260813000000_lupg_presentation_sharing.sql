create table public.lupg_presentation_shares (
  id uuid primary key default gen_random_uuid(),
  month date not null
    constraint lupg_presentation_shares_month_first_day_check
    check (extract(day from month) = 1),
  kelompok_id uuid references public.lookup_values(id) on delete restrict,
  token text not null default replace(gen_random_uuid()::text, '-', '')
    constraint lupg_presentation_shares_token_check
    check (token ~ '^[0-9a-f]{32}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (token)
);

comment on table public.lupg_presentation_shares is
  'Shareable capability links for LUPG presentation decks, scoped by month and optional kelompok.';

create unique index lupg_presentation_shares_desa_month_unique
  on public.lupg_presentation_shares (month)
  where kelompok_id is null;

create unique index lupg_presentation_shares_kelompok_month_unique
  on public.lupg_presentation_shares (kelompok_id, month)
  where kelompok_id is not null;

alter table public.lupg_presentation_shares enable row level security;

create policy lupg_presentation_shares_select
  on public.lupg_presentation_shares
  for select
  to authenticated
  using (
    (select public.user_role()) in ('super_admin', 'admin')
    or (
      (select public.user_role()) = 'team_manager'
      and kelompok_id = (select public.user_kelompok_id())
    )
  );

create policy lupg_presentation_shares_insert
  on public.lupg_presentation_shares
  for insert
  to authenticated
  with check (
    (select public.user_role()) in ('super_admin', 'admin')
    or (
      (select public.user_role()) = 'team_manager'
      and kelompok_id is not null
      and kelompok_id = (select public.user_kelompok_id())
    )
  );

create policy lupg_presentation_shares_update
  on public.lupg_presentation_shares
  for update
  to authenticated
  using (
    (select public.user_role()) in ('super_admin', 'admin')
    or (
      (select public.user_role()) = 'team_manager'
      and kelompok_id = (select public.user_kelompok_id())
    )
  )
  with check (
    (select public.user_role()) in ('super_admin', 'admin')
    or (
      (select public.user_role()) = 'team_manager'
      and kelompok_id is not null
      and kelompok_id = (select public.user_kelompok_id())
    )
  );

revoke all on table public.lupg_presentation_shares
  from public, anon, authenticated;
grant select on table public.lupg_presentation_shares to authenticated;
grant insert (month, kelompok_id, is_active)
  on table public.lupg_presentation_shares to authenticated;
grant update (is_active)
  on table public.lupg_presentation_shares to authenticated;

CREATE OR REPLACE FUNCTION public.rotate_lupg_presentation_share(p_share_id uuid)
 RETURNS lupg_presentation_shares
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  caller_role text := public.user_role();
  caller_kelompok_id uuid := public.user_kelompok_id();
  rotated public.lupg_presentation_shares%rowtype;
begin
  update public.lupg_presentation_shares share_row
  set token = replace(gen_random_uuid()::text, '-', '')
  where share_row.id = p_share_id
    and (
      caller_role in ('super_admin', 'admin')
      or (
        caller_role = 'team_manager'
        and share_row.kelompok_id is not null
        and share_row.kelompok_id = caller_kelompok_id
      )
    )
  returning share_row.* into rotated;

  if rotated.id is null then
    raise exception 'Presentation share not found or not authorized'
      using errcode = '42501';
  end if;

  return rotated;
end;
$function$;

revoke execute on function public.rotate_lupg_presentation_share(uuid)
  from public, anon, authenticated;
grant execute on function public.rotate_lupg_presentation_share(uuid)
  to authenticated;

CREATE OR REPLACE FUNCTION public.get_public_lupg_presentation_payload(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  share_row public.lupg_presentation_shares%rowtype;
  share_year integer;
  share_month_index integer;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  select share.*
  into share_row
  from public.lupg_presentation_shares share
  where share.token = p_token
    and share.is_active = true
  limit 1;

  if share_row.id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  share_year := extract(year from share_row.month)::integer;
  share_month_index := extract(month from share_row.month)::integer;

  return (
    with current_reports as (
      select mr.*
      from public.lupg_monthly_reports mr
      where mr.month = share_row.month
        and (
          share_row.kelompok_id is null
          or mr.kelompok_id = share_row.kelompok_id
        )
    ),
    yearly_reports as (
      select mr.*
      from public.lupg_monthly_reports mr
      where mr.month >= make_date(share_year, 1, 1)
        and mr.month < make_date(share_year + 1, 1, 1)
        and (
          share_row.kelompok_id is null
          or mr.kelompok_id = share_row.kelompok_id
        )
    )
    select jsonb_build_object(
      'status', 'ok',
      'share', jsonb_build_object(
        'monthKey', to_char(share_row.month, 'YYYY-MM'),
        'kelompokId', share_row.kelompok_id
      ),
      'data', jsonb_build_object(
        'monthKey', to_char(share_row.month, 'YYYY-MM'),
        'kelompokFilter', share_row.kelompok_id,
        'kelompokList', coalesce((
          select jsonb_agg(
            jsonb_build_object('id', lv.id, 'value', lv.value)
            order by lv.value
          )
          from public.lookup_values lv
          where lv.type = 'GROUP'
            and (
              share_row.kelompok_id is null
              or lv.id = share_row.kelompok_id
            )
        ), '[]'::jsonb),
        'reports', coalesce((
          select jsonb_agg(
            to_jsonb(cr)
              - 'created_at'
              - 'updated_at'
              - 'submitted_by'
            order by cr.kelompok_id
          )
          from current_reports cr
        ), '[]'::jsonb),
        'programs', coalesce((
          select jsonb_agg(
            to_jsonb(pd) - 'created_at' - 'updated_at'
            order by pd.sort_order
          )
          from public.lupg_program_definitions pd
        ), '[]'::jsonb),
        'metrics', coalesce((
          select jsonb_agg(
            to_jsonb(md) - 'created_at' - 'updated_at'
            order by md.sort_order
          )
          from public.lupg_metric_definitions md
          where md.active = true
        ), '[]'::jsonb),
        'sarprasItems', coalesce((
          select jsonb_agg(
            to_jsonb(si) - 'created_at' - 'updated_at'
            order by si.sort_order
          )
          from public.lupg_sarpras_items si
          where si.active = true
        ), '[]'::jsonb),
        'sensusSnapshots', coalesce((
          select jsonb_agg(
            to_jsonb(ss)
              - 'created_at'
              - 'updated_at'
            order by ss.monthly_report_id, ss.category_code, ss.gender
          )
          from public.lupg_sensus_snapshots ss
          where ss.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'programReports', coalesce((
          select jsonb_agg(
            to_jsonb(pr) - 'created_at' - 'updated_at'
            order by pr.monthly_report_id, pr.program_code
          )
          from public.lupg_program_reports pr
          where pr.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'metricReports', coalesce((
          select jsonb_agg(
            to_jsonb(mr) - 'created_at' - 'updated_at'
            order by mr.monthly_report_id, mr.metric_code
          )
          from public.lupg_metric_reports mr
          where mr.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'sarprasReports', coalesce((
          select jsonb_agg(
            to_jsonb(sr) - 'created_at' - 'updated_at'
            order by sr.monthly_report_id, sr.item_id
          )
          from public.lupg_sarpras_reports sr
          where sr.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'shodaqohRows', coalesce((
          select jsonb_agg(
            to_jsonb(sh) - 'created_at' - 'updated_at'
            order by sh.monthly_report_id
          )
          from public.lupg_shodaqoh sh
          where sh.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'mustinRows', coalesce((
          select jsonb_agg(
            to_jsonb(mn) - 'created_at' - 'updated_at'
            order by mn.monthly_report_id, mn.sort_order
          )
          from public.lupg_mustin_notes mn
          where mn.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'mustinTemplates', coalesce((
          select jsonb_agg(
            to_jsonb(mt) - 'created_at' - 'updated_at'
            order by mt.sort_order
          )
          from public.lupg_mustin_templates mt
          where mt.active = true
        ), '[]'::jsonb),
        'characterTargetItems', coalesce((
          select jsonb_agg(
            to_jsonb(cti) - 'created_at' - 'updated_at'
            order by cti.level_code, cti.category_label, cti.sort_order
          )
          from public.lupg_character_target_items cti
          join public.lupg_character_target_templates ctt
            on ctt.id = cti.template_id
          where ctt.year = share_year
            and ctt.status = 'active'
            and cti.month_index = share_month_index
            and cti.active = true
        ), '[]'::jsonb),
        'characterTargetReports', coalesce((
          select jsonb_agg(
            to_jsonb(ctr) - 'created_at' - 'updated_at'
            order by ctr.monthly_report_id, ctr.target_item_id
          )
          from public.lupg_character_target_reports ctr
          where ctr.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'characterActivities', coalesce((
          select jsonb_agg(
            to_jsonb(cma) - 'created_at' - 'updated_at'
            order by cma.level_code, cma.sort_order
          )
          from public.lupg_character_monitoring_activities cma
          where cma.active = true
        ), '[]'::jsonb),
        'characterReports', coalesce((
          select jsonb_agg(
            to_jsonb(cmr) - 'created_at' - 'updated_at'
            order by cmr.monthly_report_id, cmr.activity_id
          )
          from public.lupg_character_monitoring_reports cmr
          where cmr.monthly_report_id in (select id from current_reports)
        ), '[]'::jsonb),
        'yearlyMonthlyReports', coalesce((
          select jsonb_agg(
            to_jsonb(yr)
              - 'created_at'
              - 'updated_at'
              - 'submitted_by'
            order by yr.month, yr.kelompok_id
          )
          from yearly_reports yr
        ), '[]'::jsonb),
        'yearlyProgramReports', coalesce((
          select jsonb_agg(
            to_jsonb(ypr) - 'created_at' - 'updated_at'
            order by ypr.monthly_report_id, ypr.program_code
          )
          from public.lupg_program_reports ypr
          where ypr.monthly_report_id in (select id from yearly_reports)
        ), '[]'::jsonb),
        'yearlyMetricReports', coalesce((
          select jsonb_agg(
            to_jsonb(ymr) - 'created_at' - 'updated_at'
            order by ymr.monthly_report_id, ymr.metric_code
          )
          from public.lupg_metric_reports ymr
          where ymr.monthly_report_id in (select id from yearly_reports)
        ), '[]'::jsonb),
        'yearlyMetricMonthlyReports', coalesce((
          select jsonb_agg(
            to_jsonb(yr)
              - 'created_at'
              - 'updated_at'
              - 'submitted_by'
            order by yr.month, yr.kelompok_id
          )
          from yearly_reports yr
        ), '[]'::jsonb),
        'yearlyShodaqohRows', case
          when share_row.kelompok_id is null then '[]'::jsonb
          else coalesce((
            select jsonb_agg(
              to_jsonb(ysh) - 'created_at' - 'updated_at'
              order by ysh.monthly_report_id
            )
            from public.lupg_shodaqoh ysh
            where ysh.monthly_report_id in (select id from yearly_reports)
          ), '[]'::jsonb)
        end,
        'activityPhotos', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', ap.id,
              'caption', ap.caption,
              'storagePath', ap.storage_path
            )
            order by ap.report_id, ap.sort_order, ap.id
          )
          from public.lupg_activity_photos ap
          where ap.report_id in (select id from current_reports)
        ), '[]'::jsonb)
      )
    )
  );
end;
$function$;

revoke execute on function public.get_public_lupg_presentation_payload(text)
  from public, anon, authenticated;
grant execute on function public.get_public_lupg_presentation_payload(text)
  to anon;
