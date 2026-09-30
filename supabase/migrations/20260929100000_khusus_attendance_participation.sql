-- Khusus participants join attendance forms: searchable and submittable.
-- Their records stay excluded from rate numerators (frontend aggregation
-- filters them) and from every public dashboard / Intensif surface, which
-- keep their own khusus guards from migration 20260929030000.

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

CREATE OR REPLACE FUNCTION public.submit_attendance_guarded(
  p_form_id uuid,
  p_participant_id uuid,
  p_status text,
  p_permission_reason text DEFAULT NULL,
  p_permission_description text DEFAULT NULL,
  p_temp_name text DEFAULT NULL,
  p_temp_group text DEFAULT NULL,
  p_temp_category text DEFAULT NULL,
  p_temp_gender text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_form public.attendance_forms%rowtype;
  v_participant record;
  v_category text;
  v_attendance_id uuid;
BEGIN
  SELECT * INTO v_form FROM public.attendance_forms
  WHERE id = p_form_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Form absensi tidak ditemukan atau tidak aktif'; END IF;
  IF upper(COALESCE(p_status, '')) NOT IN ('HADIR', 'IZIN') THEN
    RAISE EXCEPTION 'Status absensi tidak valid';
  END IF;

  IF p_participant_id IS NOT NULL THEN
    SELECT p.group_id, cat.value AS category_value INTO v_participant
    FROM public.participants p
    JOIN public.lookup_values cat ON cat.id = p.category_id
    WHERE p.id = p_participant_id
      AND p.status_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Peserta tidak ditemukan atau tidak aktif'; END IF;
    IF v_form.form_type = 'kelompok'
       AND v_participant.group_id IS DISTINCT FROM v_form.kelompok_id THEN
      RAISE EXCEPTION 'Peserta tidak sesuai dengan kelompok form';
    END IF;
    v_category := CASE v_participant.category_value
      WHEN 'GPN A' THEN 'A' WHEN 'GPN B' THEN 'B'
      WHEN 'Anak Remaja' THEN 'AR' ELSE v_participant.category_value END;
    IF NOT (v_category = ANY(COALESCE(v_form.allowed_categories, ARRAY['A', 'B', 'AR']::text[]))) THEN
      RAISE EXCEPTION 'Kategori peserta tidak sesuai dengan konfigurasi form';
    END IF;
  ELSE
    IF NULLIF(trim(COALESCE(p_temp_name, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Nama peserta wajib diisi';
    END IF;
    IF NOT (p_temp_category = ANY(COALESCE(v_form.allowed_categories, ARRAY['A', 'B', 'AR']::text[]))) THEN
      RAISE EXCEPTION 'Kategori peserta tidak sesuai dengan konfigurasi form';
    END IF;
    IF v_form.form_type = 'kelompok' AND NOT EXISTS (
      SELECT 1 FROM public.lookup_values lv
      WHERE lv.id = v_form.kelompok_id AND lv.value = p_temp_group
    ) THEN
      RAISE EXCEPTION 'Kelompok tidak sesuai dengan konfigurasi form';
    END IF;
  END IF;

  INSERT INTO public.attendance (
    form_id, participant_id, status, permission_reason, permission_description,
    temp_name, temp_group, temp_category, temp_gender, timestamp, is_pending,
    merged_with_participant_id
  ) VALUES (
    p_form_id, p_participant_id, upper(p_status), NULLIF(p_permission_reason, ''),
    NULLIF(p_permission_description, ''),
    CASE WHEN p_participant_id IS NULL THEN p_temp_name END,
    CASE WHEN p_participant_id IS NULL THEN p_temp_group END,
    CASE WHEN p_participant_id IS NULL THEN p_temp_category END,
    CASE WHEN p_participant_id IS NULL THEN p_temp_gender END,
    now(), false, NULL
  ) RETURNING id INTO v_attendance_id;
  RETURN v_attendance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.search_form_participants(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_attendance_guarded(uuid, uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_form_participants(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_attendance_guarded(uuid, uuid, text, text, text, text, text, text, text) TO anon, authenticated;
