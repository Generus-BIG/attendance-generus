-- =============================================================================
-- Sensus sync: cross-run applied/pending reconcile
-- =============================================================================
-- Every sync run stages fresh copies of all source rows, and applying an item
-- only flipped that exact row — the same person stayed "pending" in every
-- other run. sensus_sync_reconcile_applied() marks identical pending rows
-- (same normalized name + kelompok + gender + identical source fields) as
-- applied across ALL runs, carrying over the applied row's participant.
-- Rows whose desabig source data changed stay pending for review; rejected
-- rows are never touched.

CREATE OR REPLACE FUNCTION public.sensus_sync_reconcile_applied()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  WITH src AS (
    SELECT *
    FROM public.sensus_sync_items
    WHERE status = 'applied'
      AND matched_participant_id IS NOT NULL
  )
  UPDATE public.sensus_sync_items other
  SET status = 'applied',
      matched_participant_id = coalesce(
        other.matched_participant_id,
        src.matched_participant_id
      ),
      error = null
  FROM src
  WHERE other.status = 'pending'
    AND other.id <> src.id
    AND (
      other.matched_participant_id IS NULL
      OR other.matched_participant_id = src.matched_participant_id
    )
    AND lower(regexp_replace(other.source_name, '[^a-zA-Z0-9]', '', 'g'))
      = lower(regexp_replace(src.source_name, '[^a-zA-Z0-9]', '', 'g'))
    AND other.source_kelompok = src.source_kelompok
    AND other.source_gender = src.source_gender
    AND coalesce(other.source_birth_date::text, '')
      = coalesce(src.source_birth_date::text, '')
    AND other.source_kategori = src.source_kategori
    AND other.source_khusus = src.source_khusus;
END;
$function$;

-- Applied new-participant rows now record the created participant id, so the
-- reconcile can reference it (and history shows who was created).
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
  v_participant_id uuid;
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

      v_participant_id := v_item.matched_participant_id;

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
        ) returning id into v_participant_id;
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
          matched_participant_id = v_participant_id,
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

  PERFORM public.sensus_sync_reconcile_applied();

  return jsonb_build_object('applied', v_ok, 'failed', v_fail);
end;
$$;

-- One-time heal: historical applied-new rows never recorded the participant
-- they created; resolve them by identity so the reconcile can reference them.
UPDATE public.sensus_sync_items i
SET matched_participant_id = p.id
FROM public.participants p
JOIN public.lookup_values g
  ON g.id = p.group_id AND g.type = 'GROUP'
WHERE i.status = 'applied'
  AND i.matched_participant_id IS NULL
  AND p.name = i.source_name
  AND p.gender = i.source_gender
  AND g.value = i.source_kelompok;

-- Heal existing cross-run inconsistencies.
SELECT public.sensus_sync_reconcile_applied();

REVOKE ALL ON FUNCTION public.apply_sensus_sync_items(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_sensus_sync_items(uuid[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sensus_sync_reconcile_applied() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sensus_sync_reconcile_applied() TO service_role;
