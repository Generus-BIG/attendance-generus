-- Similar resolve ("Fahmi F" -> "Fahmi Fadillah") replaces every desabig
-- field except the name: birth_date, category, and khusus follow the source,
-- while the existing participant name is preserved so approvals history and
-- attendance records stay readable. New rows still insert source_name.
CREATE OR REPLACE FUNCTION public.apply_sensus_sync_items(p_item_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.user_role();
  v_id uuid;
  v_item public.sensus_sync_items%ROWTYPE;
  v_category_id uuid;
  v_group_id uuid;
  v_ok integer := 0;
  v_fail integer := 0;
BEGIN
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
        set birth_date = v_item.source_birth_date,
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

REVOKE ALL ON FUNCTION public.apply_sensus_sync_items(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_sensus_sync_items(uuid[]) TO authenticated;
