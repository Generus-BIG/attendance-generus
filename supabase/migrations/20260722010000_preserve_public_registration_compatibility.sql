-- Preserve legacy AR search behavior and prevent repeat anonymous registration
-- calls from overwriting birth data already supplied for a pending participant.
CREATE OR REPLACE FUNCTION public.search_form_participants(
  p_form_id uuid,
  p_query text DEFAULT ''
)
RETURNS TABLE (id uuid, name text, gender text, group_name text, category_name text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.name, p.gender, grp.value, cat.value
  FROM public.attendance_forms af
  JOIN public.participants p
    ON p.status_active = true
   AND (af.form_type <> 'kelompok' OR p.group_id = af.kelompok_id)
  JOIN public.lookup_values grp ON grp.id = p.group_id
  JOIN public.lookup_values cat ON cat.id = p.category_id
  WHERE af.id = p_form_id
    AND af.is_active = true
    AND (CASE cat.value
      WHEN 'GPN A' THEN 'A'
      WHEN 'GPN B' THEN 'B'
      WHEN 'Anak Remaja' THEN 'AR'
      ELSE cat.value
    END) = ANY(COALESCE(af.allowed_categories, ARRAY['A', 'B', 'AR']::text[]))
    AND p.name ILIKE '%' || COALESCE(p_query, '') || '%'
  ORDER BY p.name
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.submit_pending_attendance_guarded(
  p_form_id uuid, p_status text, p_permission_reason text,
  p_permission_description text, p_temp_name text, p_temp_group text,
  p_temp_category text, p_temp_gender text, p_birth_place text, p_birth_date date
)
RETURNS TABLE(outcome text, attendance_id uuid, pending_participant_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_pending public.pending_participants%rowtype;
  existing_attendance_for_form uuid;
  inserted_attendance_id uuid;
  form_scope record;
  allowed_categories text[];
  identity_key text;
BEGIN
  IF p_form_id IS NULL THEN RAISE EXCEPTION 'Form id is required'; END IF;
  identity_key := concat_ws('|', public.normalize_participant_name(p_temp_name),
    COALESCE(p_temp_group, ''), COALESCE(p_temp_category, ''));
  PERFORM pg_advisory_xact_lock(hashtextextended(identity_key, 0));

  SELECT af.form_type, af.kelompok_id, af.allowed_categories, lv.value AS kelompok_value
  INTO form_scope FROM public.attendance_forms af
  LEFT JOIN public.lookup_values lv ON lv.id = af.kelompok_id
  WHERE af.id = p_form_id AND af.is_active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Form absensi tidak ditemukan atau tidak aktif'; END IF;
  allowed_categories := COALESCE(form_scope.allowed_categories, ARRAY['A', 'B', 'AR']::text[]);
  IF NOT (p_temp_category = ANY(allowed_categories)) THEN
    RAISE EXCEPTION 'Kategori peserta tidak sesuai dengan konfigurasi form';
  END IF;
  IF form_scope.form_type = 'kelompok'
     AND COALESCE(form_scope.kelompok_value, '') <> p_temp_group THEN
    RAISE EXCEPTION 'Kelompok tidak sesuai dengan konfigurasi form';
  END IF;

  SELECT pp.* INTO existing_pending FROM public.pending_participants pp
  WHERE public.normalize_participant_name(pp.name) = public.normalize_participant_name(p_temp_name)
    AND pp.suggested_group = p_temp_group
    AND pp.suggested_category = p_temp_category
    AND pp.status = 'pending'
  ORDER BY pp.created_at ASC LIMIT 1 FOR UPDATE;

  IF existing_pending.id IS NOT NULL THEN
    SELECT a.id INTO existing_attendance_for_form FROM public.attendance a
    WHERE a.id = ANY(COALESCE(existing_pending.attendance_ref_ids, ARRAY[]::uuid[]))
      AND a.form_id = p_form_id LIMIT 1;
    IF existing_attendance_for_form IS NOT NULL THEN
      RETURN QUERY SELECT 'duplicate_same_form'::text, NULL::uuid, existing_pending.id;
      RETURN;
    END IF;
    INSERT INTO public.attendance (
      form_id, participant_id, status, permission_reason, permission_description,
      temp_name, temp_group, temp_category, temp_gender, timestamp
    ) VALUES (
      p_form_id, NULL, upper(p_status), NULLIF(p_permission_reason, ''),
      NULLIF(p_permission_description, ''), p_temp_name, p_temp_group,
      p_temp_category, p_temp_gender, now()
    ) RETURNING id INTO inserted_attendance_id;
    UPDATE public.pending_participants pp SET
      attendance_ref_ids = array_append(COALESCE(pp.attendance_ref_ids, ARRAY[]::uuid[]), inserted_attendance_id),
      birth_place = COALESCE(pp.birth_place, NULLIF(p_birth_place, '')),
      birth_date = COALESCE(pp.birth_date, p_birth_date), updated_at = now()
    WHERE pp.id = existing_pending.id;
    RETURN QUERY SELECT 'appended'::text, inserted_attendance_id, existing_pending.id;
    RETURN;
  END IF;

  INSERT INTO public.attendance (
    form_id, participant_id, status, permission_reason, permission_description,
    temp_name, temp_group, temp_category, temp_gender, timestamp
  ) VALUES (
    p_form_id, NULL, upper(p_status), NULLIF(p_permission_reason, ''),
    NULLIF(p_permission_description, ''), p_temp_name, p_temp_group,
    p_temp_category, p_temp_gender, now()
  ) RETURNING id INTO inserted_attendance_id;
  INSERT INTO public.pending_participants (
    name, suggested_group, suggested_gender, suggested_category,
    attendance_ref_ids, status, birth_place, birth_date
  ) VALUES (
    p_temp_name, p_temp_group, p_temp_gender, p_temp_category,
    ARRAY[inserted_attendance_id], 'pending', p_birth_place, p_birth_date
  ) RETURNING id INTO pending_participant_id;
  outcome := 'created'; attendance_id := inserted_attendance_id; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.search_form_participants(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_pending_attendance_guarded(uuid, text, text, text, text, text, text, text, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_form_participants(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_pending_attendance_guarded(uuid, text, text, text, text, text, text, text, text, date) TO anon, authenticated;
