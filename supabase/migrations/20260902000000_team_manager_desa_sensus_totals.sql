create or replace function public.list_lupg_desa_sensus_totals()
returns table (
  category_code text,
  gender text,
  count bigint
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if (select public.user_role()) not in ('super_admin', 'admin', 'team_manager') then
    raise exception 'Not authorized to read desa sensus totals'
      using errcode = '42501';
  end if;

  return query
  with totals as (
    select s.category_code, s.gender, sum(s.count)::bigint as count
    from public.lupg_sensus s
    where s.category_code not in ('GPN_A', 'GPN_B', 'AR', 'APR')
    group by s.category_code, s.gender

    union all

    select d.category_code, d.gender, sum(d.count)::bigint as count
    from public.lupg_sensus_participant_derived d
    group by d.category_code, d.gender
  )
  select t.category_code, t.gender, sum(t.count)::bigint as count
  from totals t
  group by t.category_code, t.gender
  order by t.category_code, t.gender;
end;
$$;

revoke all on function public.list_lupg_desa_sensus_totals() from public, anon, authenticated;
grant execute on function public.list_lupg_desa_sensus_totals() to authenticated;
