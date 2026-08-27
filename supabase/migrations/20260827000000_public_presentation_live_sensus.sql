alter function public.get_public_lupg_presentation_payload(text)
  rename to get_public_lupg_presentation_payload_base;

create function public.get_public_lupg_presentation_payload(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  base_payload jsonb;
  kelompok_ids uuid[];
  sensus_cells jsonb;
begin
  base_payload := public.get_public_lupg_presentation_payload_base(p_token);
  if base_payload->>'status' <> 'ok' then
    return base_payload;
  end if;

  select coalesce(array_agg((kelompok->>'id')::uuid), '{}'::uuid[])
  into kelompok_ids
  from jsonb_array_elements(base_payload->'data'->'kelompokList') as kelompok;

  select coalesce(jsonb_agg(to_jsonb(cell) order by cell.kelompok_id, cell.category_code, cell.gender), '[]'::jsonb)
  into sensus_cells
  from (
    select s.kelompok_id, s.category_code, s.gender, s.count
    from public.lupg_sensus s
    where s.kelompok_id = any(kelompok_ids)
      and s.category_code not in ('APR', 'AR', 'GPN_A', 'GPN_B')

    union all

    select d.kelompok_id, d.category_code, d.gender, d.count
    from public.lupg_sensus_participant_derived d
    where d.kelompok_id = any(kelompok_ids)
  ) cell;

  return jsonb_set(base_payload, '{data,sensusCells}', sensus_cells);
end;
$function$;

revoke execute on function public.get_public_lupg_presentation_payload_base(text)
  from public, anon, authenticated;
revoke execute on function public.get_public_lupg_presentation_payload(text)
  from public, anon, authenticated;
grant execute on function public.get_public_lupg_presentation_payload(text)
  to anon;
