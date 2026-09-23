create or replace function public.get_public_lupg_program_analytics_payload(
  p_token text,
  p_month text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  share_row public.lupg_program_analytics_shares%rowtype;
  requested_month date;
  selected_month date;
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

  requested_month := case
    when p_month ~ '^\d{4}-(0[1-9]|1[0-2])$'
      then to_date(p_month || '-01', 'YYYY-MM-DD')
    else null
  end;

  if requested_month is not null and exists (
      select 1 from public.lupg_monthly_reports
      where month = requested_month and status = 'submitted'
    ) then
    selected_month := requested_month;
  else
    selected_month := share_row.month;
  end if;
  previous_month := (selected_month - interval '1 month')::date;

  return (
    with groups as (
      select lv.id, lv.value,
        'group-' || row_number() over (order by lv.value, lv.id)::text as group_key
      from public.lookup_values lv
      where lv.type = 'GROUP'
    ),
    submitted_reports as (
      select mr.id, mr.month, mr.kelompok_id, g.group_key
      from public.lupg_monthly_reports mr
      join groups g on g.id = mr.kelompok_id
      where mr.status = 'submitted'
        and mr.month between (selected_month - interval '11 months')::date and selected_month
    ),
    program_items as (
      select row_number() over (order by item.sort_order, item.name)::integer as item_index,
        item.id, item.name, item.sort_order
      from public.lupg_sarpras_items item
      where item.active = true
    )
    select jsonb_build_object(
      'status', 'ok',
      'share', jsonb_build_object(
        'monthKey', to_char(share_row.month, 'YYYY-MM'),
        'selectedMonthKey', to_char(selected_month, 'YYYY-MM'),
        'availableMonthKeys', coalesce((
          select jsonb_agg(month_key order by month_key desc)
          from (
            select distinct to_char(mr.month, 'YYYY-MM') as month_key
            from public.lupg_monthly_reports mr
            where mr.status = 'submitted'
          ) available_months
        ), '[]'::jsonb)
      ),
      'data', jsonb_build_object(
        'kelompoks', coalesce((select jsonb_agg(jsonb_build_object('key', g.group_key, 'name', g.value) order by g.value) from groups g), '[]'::jsonb),
        'reports', coalesce((select jsonb_agg(jsonb_build_object('kelompokKey', report.group_key, 'monthKey', to_char(report.month, 'YYYY-MM'), 'status', 'submitted') order by report.month, report.group_key) from submitted_reports report), '[]'::jsonb),
        'programs', coalesce((select jsonb_agg(jsonb_build_object('code', definition.code, 'name', definition.name) order by definition.sort_order) from public.lupg_program_definitions definition where definition.active = true), '[]'::jsonb),
        'programValues', coalesce((select jsonb_agg(jsonb_build_object('kelompokKey', report.group_key, 'monthKey', to_char(report.month, 'YYYY-MM'), 'code', program.program_code, 'count', program.count_this_month, 'denominator', program.denominator) order by report.month, report.group_key, program.program_code) from submitted_reports report join public.lupg_program_reports program on program.monthly_report_id = report.id), '[]'::jsonb),
        'trendProgramValues', coalesce((select jsonb_agg(jsonb_build_object('monthKey', to_char(report.month, 'YYYY-MM'), 'code', program.program_code, 'count', program.count_this_month, 'denominator', program.denominator) order by report.month, program.program_code) from public.lupg_monthly_reports report join public.lupg_program_reports program on program.monthly_report_id = report.id where report.month between (selected_month - interval '11 months')::date and selected_month), '[]'::jsonb),
        'metricValues', coalesce((select jsonb_agg(jsonb_build_object('kelompokKey', report.group_key, 'monthKey', to_char(report.month, 'YYYY-MM'), 'code', metric.metric_code, 'value', metric.current_value) order by report.month, report.group_key, metric.metric_code) from submitted_reports report join public.lupg_metric_reports metric on metric.monthly_report_id = report.id where report.month in (selected_month, previous_month)), '[]'::jsonb),
        'sarprasItems', coalesce((select jsonb_agg(jsonb_build_object('index', item.item_index, 'name', item.name) order by item.item_index) from program_items item), '[]'::jsonb),
        'sarprasValues', coalesce((select jsonb_agg(jsonb_build_object('kelompokKey', report.group_key, 'monthKey', to_char(report.month, 'YYYY-MM'), 'itemIndex', item.item_index, 'fulfilled', sarpras.is_fulfilled) order by report.group_key, item.item_index) from submitted_reports report join public.lupg_sarpras_reports sarpras on sarpras.monthly_report_id = report.id join program_items item on item.id = sarpras.item_id where report.month = selected_month), '[]'::jsonb),
        'shodaqohValues', coalesce((select jsonb_agg(jsonb_build_object('kelompokKey', report.group_key, 'monthKey', to_char(report.month, 'YYYY-MM'), 'nominal', shodaqoh.nominal) order by report.month, report.group_key) from submitted_reports report join public.lupg_shodaqoh shodaqoh on shodaqoh.monthly_report_id = report.id where report.month in (selected_month, previous_month)), '[]'::jsonb),
        'sensus', coalesce((select jsonb_agg(jsonb_build_object('category', current_sensus.category_code, 'count', current_sensus.total_count) order by current_sensus.category_code) from (select sensus.category_code, sum(sensus.count)::integer as total_count from public.lupg_sensus sensus join groups g on g.id = sensus.kelompok_id group by sensus.category_code) current_sensus), '[]'::jsonb),
        'mustinNotes', coalesce((select jsonb_agg(jsonb_build_object('kelompokKey', report.group_key, 'monthKey', to_char(report.month, 'YYYY-MM'), 'pokokMasalah', note.pokok_masalah, 'keputusanRencana', note.keputusan_rencana, 'sortOrder', note.sort_order) order by report.group_key, note.sort_order) from submitted_reports report join public.lupg_mustin_notes note on note.monthly_report_id = report.id where report.month = selected_month), '[]'::jsonb),
        'documentation', coalesce((select jsonb_agg(jsonb_build_object('kelompokKey', report.group_key, 'monthKey', to_char(report.month, 'YYYY-MM'), 'caption', photo.caption, 'sortOrder', photo.sort_order) order by report.group_key, photo.sort_order, photo.id) from submitted_reports report join public.lupg_activity_photos photo on photo.report_id = report.id where report.month = selected_month), '[]'::jsonb)
      )
    )
  );
end;
$function$;
