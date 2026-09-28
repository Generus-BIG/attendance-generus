-- Keep Sensus-only (khusus) participants outside every attendance authority path.
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
   AND p.is_khusus = false
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
      AND p.status_active = true
      AND p.is_khusus = false;
    IF NOT FOUND THEN RAISE EXCEPTION 'Peserta tidak ditemukan, tidak aktif, atau khusus'; END IF;
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

-- The share token remains the capability. Khusus rows are omitted before any
-- attendance aggregation while privacy-sensitive identifiers stay surrogate-keyed.
CREATE OR REPLACE FUNCTION public.get_public_dashboard_payload(p_token text, p_month text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  share_row public.public_dashboard_shares%rowtype;
  month_start timestamptz;
  month_end timestamptz;
  allowed_form_ids uuid[];
  follow_up_enabled boolean;
  realtime_log_enabled boolean;
BEGIN
  SELECT * INTO share_row FROM public.public_dashboard_shares
  WHERE token = p_token AND is_active = true AND scope = 'desa' LIMIT 1;
  IF share_row.id IS NULL THEN RETURN jsonb_build_object('status', 'unavailable'); END IF;
  month_start := date_trunc('month', COALESCE(to_date(NULLIF(p_month, ''), 'YYYY-MM'), now()::date));
  month_end := month_start + interval '1 month';
  follow_up_enabled := COALESCE((share_row.visible_sections ->> 'followUp')::boolean, false);
  realtime_log_enabled := COALESCE((share_row.visible_sections ->> 'realtimeLog')::boolean, false);

  IF share_row.display_mode = 'forms' THEN
    SELECT COALESCE(array_agg(af.id ORDER BY af.date), ARRAY[]::uuid[]) INTO allowed_form_ids
    FROM public.attendance_forms af
    WHERE af.form_type = 'desa' AND af.id = ANY(share_row.form_ids);
  ELSE
    SELECT COALESCE(array_agg(af.id ORDER BY af.date), ARRAY[]::uuid[]) INTO allowed_form_ids
    FROM public.attendance_forms af
    WHERE af.form_type = 'desa'
      AND (share_row.form_mode = 'all' OR af.id = ANY(share_row.form_ids));
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'share', jsonb_build_object(
      'id', share_row.id, 'name', share_row.name, 'token', share_row.token,
      'visibleSections', share_row.visible_sections, 'displayMode', share_row.display_mode,
      'formMode', share_row.form_mode, 'formIds', share_row.form_ids),
    'forms', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', af.id, 'title', af.title, 'date', af.date) ORDER BY af.date)
      FROM public.attendance_forms af WHERE af.id = ANY(allowed_form_ids)), '[]'::jsonb),
    'records', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', CASE WHEN follow_up_enabled THEN a.id::text ELSE md5(a.id::text) END,
      'form_id', a.form_id,
      'participant_id', CASE WHEN a.participant_id IS NULL THEN NULL
        WHEN follow_up_enabled THEN a.participant_id::text ELSE md5(a.participant_id::text) END,
      'status', a.status, 'timestamp', a.timestamp, 'is_pending', a.is_pending,
      'temp_name', CASE WHEN follow_up_enabled OR realtime_log_enabled THEN a.temp_name END,
      'temp_category', a.temp_category,
      'participant_name', CASE WHEN follow_up_enabled OR realtime_log_enabled THEN p.name END,
      'category_value', COALESCE(cat.value, a.temp_category),
      'group_value', COALESCE(grp.value, a.temp_group),
      'gender_value', COALESCE(p.gender, a.temp_gender),
      'permission_reason', a.permission_reason,
      'permission_description', CASE WHEN realtime_log_enabled THEN a.permission_description END
    ) ORDER BY a.timestamp)
      FROM public.attendance a
      LEFT JOIN public.participants p ON p.id = a.participant_id
      LEFT JOIN public.lookup_values cat ON cat.id = p.category_id
      LEFT JOIN public.lookup_values grp ON grp.id = p.group_id
      WHERE a.form_id = ANY(allowed_form_ids)
        AND (share_row.display_mode = 'forms'
          OR (a.timestamp >= month_start AND a.timestamp < month_end))
        AND a.is_pending = false
        AND (a.participant_id IS NULL OR p.is_khusus = false)), '[]'::jsonb),
    'censusParticipants', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', CASE WHEN follow_up_enabled THEN p.id::text ELSE md5(p.id::text) END,
      'name', CASE WHEN follow_up_enabled THEN p.name END,
      'group', grp.value, 'category', cat.value, 'gender', p.gender
    ) ORDER BY grp.value, p.name)
      FROM public.participants p
      LEFT JOIN public.lookup_values cat ON cat.id = p.category_id
      LEFT JOIN public.lookup_values grp ON grp.id = p.group_id
      WHERE p.status_active = true
        AND p.is_khusus = false
        AND cat.value IN ('GPN A', 'GPN B', 'AR', 'APR', 'Paud', 'ACR')),
      '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_dashboard_payload(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_dashboard_payload(text, text) TO anon, authenticated;

-- Candidate-bearing sync rows cannot be applied until an administrator chooses
-- their participant. The apply RPC's per-item subtransaction rolls back any
-- attempted participant write when this status transition violates the check.
ALTER TABLE public.sensus_sync_items
  ADD CONSTRAINT sensus_sync_items_applied_match_resolved
  CHECK (
    status <> 'applied'
    OR matched_participant_id IS NOT NULL
    OR jsonb_array_length(COALESCE(patch -> 'candidates', '[]'::jsonb)) = 0
  ) NOT VALID;

-- Candidate filtering is not an authority boundary: enforce eligibility on every
-- direct insert/update as well.
CREATE OR REPLACE FUNCTION public.fn_lupg_intensif_validate_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_gender text;
  v_category text;
  v_program text;
BEGIN
  SELECT p.name, p.gender, c.value, a.program_code
  INTO v_name, v_gender, v_category, v_program
  FROM public.lupg_intensif_activities a
  JOIN public.participants p ON p.id = NEW.participant_id
  JOIN public.lookup_values c ON c.id = p.category_id
  WHERE a.id = NEW.activity_id
    AND p.status_active
    AND p.is_khusus = false
    AND p.group_id = a.kelompok_id;

  IF NOT FOUND
     OR (v_program = 'APR_INTENSIF' AND v_category <> 'APR')
     OR (v_program = 'AR_INTENSIF' AND v_category <> 'AR') THEN
    RAISE EXCEPTION 'Peserta Intensif harus aktif, bukan peserta khusus, sesuai kelompok, dan sesuai kategori program';
  END IF;

  NEW.participant_name := v_name;
  NEW.participant_gender := v_gender;
  NEW.participant_category_code := v_category;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_lupg_intensif_validate_attendance() FROM PUBLIC, anon, authenticated;
