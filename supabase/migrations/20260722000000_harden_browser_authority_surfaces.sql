-- Browser clients use scoped RPCs; base tables remain private behind RLS.
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
    AND cat.value = ANY (
      SELECT CASE value
        WHEN 'A' THEN 'GPN A'
        WHEN 'B' THEN 'GPN B'
        WHEN 'Anak Remaja' THEN 'AR'
        ELSE value
      END
      FROM unnest(COALESCE(af.allowed_categories, ARRAY['A', 'B', 'AR']::text[])) AS value
    )
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
    WHERE p.id = p_participant_id AND p.status_active = true;
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

DROP POLICY IF EXISTS attendance_select_anon ON public.attendance;
DROP POLICY IF EXISTS participants_select_anon ON public.participants;
DROP POLICY IF EXISTS attendance_insert_anon ON public.attendance;
REVOKE SELECT, INSERT ON public.attendance FROM anon;
REVOKE SELECT ON public.participants FROM anon;

DROP POLICY IF EXISTS pending_participants_insert_public ON public.pending_participants;
CREATE POLICY pending_participants_insert_auth ON public.pending_participants
  FOR INSERT TO authenticated WITH CHECK (
    COALESCE(status, 'pending') = 'pending'
    AND (user_role() IN ('super_admin', 'admin')
      OR (user_role() = 'team_manager' AND suggested_group = user_kelompok()))
  );
REVOKE INSERT ON public.pending_participants FROM anon;

DROP POLICY IF EXISTS participants_select_auth ON public.participants;
CREATE POLICY participants_select_auth ON public.participants
  FOR SELECT TO authenticated USING (
    user_role() IN ('super_admin', 'admin', 'member')
    OR (user_role() = 'team_manager' AND group_id = user_kelompok_id())
  );
DROP POLICY IF EXISTS attendance_select_auth ON public.attendance;
CREATE POLICY attendance_select_auth ON public.attendance
  FOR SELECT TO authenticated USING (
    user_role() IN ('super_admin', 'admin', 'member')
    OR (user_role() = 'team_manager' AND (
      EXISTS (SELECT 1 FROM public.participants p
        WHERE p.id = attendance.participant_id AND p.group_id = user_kelompok_id())
      OR (participant_id IS NULL AND temp_group = user_kelompok())
    ))
  );
DROP POLICY IF EXISTS attendance_forms_select_auth ON public.attendance_forms;

-- The share token is the capability. Names are exposed only for enabled sections.
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
        AND a.is_pending = false), '[]'::jsonb),
    'censusParticipants', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', CASE WHEN follow_up_enabled THEN p.id::text ELSE md5(p.id::text) END,
      'name', CASE WHEN follow_up_enabled THEN p.name END,
      'group', grp.value, 'category', cat.value, 'gender', p.gender
    ) ORDER BY grp.value, p.name)
      FROM public.participants p
      LEFT JOIN public.lookup_values cat ON cat.id = p.category_id
      LEFT JOIN public.lookup_values grp ON grp.id = p.group_id
      WHERE p.status_active = true AND cat.value IN ('GPN A', 'GPN B', 'AR', 'APR')),
      '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_dashboard_payload(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_dashboard_payload(text, text) TO anon, authenticated;

-- LUPG is readable by administrators or an owning team manager, never members.
CREATE OR REPLACE FUNCTION public.lupg_mr_readable(p_mr_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.lupg_monthly_reports mr
    WHERE mr.id = p_mr_id AND (
      public.user_role() IN ('super_admin', 'admin')
      OR (public.user_role() = 'team_manager' AND mr.kelompok_id = public.user_kelompok_id())
    ));
$$;

DROP POLICY IF EXISTS lupg_monthly_reports_select ON public.lupg_monthly_reports;
CREATE POLICY lupg_monthly_reports_select ON public.lupg_monthly_reports FOR SELECT USING (
  user_role() IN ('super_admin', 'admin')
  OR (user_role() = 'team_manager' AND kelompok_id = user_kelompok_id()));
DROP POLICY IF EXISTS lupg_sensus_select ON public.lupg_sensus;
CREATE POLICY lupg_sensus_select ON public.lupg_sensus FOR SELECT USING (
  user_role() IN ('super_admin', 'admin')
  OR (user_role() = 'team_manager' AND kelompok_id = user_kelompok_id()));
DROP POLICY IF EXISTS lupg_sensus_snap_select ON public.lupg_sensus_snapshots;
CREATE POLICY lupg_sensus_snap_select ON public.lupg_sensus_snapshots FOR SELECT USING (
  user_role() IN ('super_admin', 'admin')
  OR (user_role() = 'team_manager' AND kelompok_id = user_kelompok_id()));

DROP POLICY IF EXISTS lupg_sensus_insert ON public.lupg_sensus;
CREATE POLICY lupg_sensus_insert ON public.lupg_sensus FOR INSERT WITH CHECK (
  category_code NOT IN ('GPN_A', 'GPN_B', 'AR', 'APR') AND (
    user_role() IN ('super_admin', 'admin')
    OR (user_role() = 'team_manager' AND kelompok_id = user_kelompok_id())));
DROP POLICY IF EXISTS lupg_sensus_update ON public.lupg_sensus;
CREATE POLICY lupg_sensus_update ON public.lupg_sensus FOR UPDATE USING (
  category_code NOT IN ('GPN_A', 'GPN_B', 'AR', 'APR') AND (
    user_role() IN ('super_admin', 'admin')
    OR (user_role() = 'team_manager' AND kelompok_id = user_kelompok_id())))
  WITH CHECK (category_code NOT IN ('GPN_A', 'GPN_B', 'AR', 'APR') AND (
    user_role() IN ('super_admin', 'admin')
    OR (user_role() = 'team_manager' AND kelompok_id = user_kelompok_id())));
REVOKE SELECT ON public.lupg_sensus_participant_derived FROM anon;
DROP POLICY IF EXISTS lupg_sensus_snap_update_admin ON public.lupg_sensus_snapshots;
REVOKE UPDATE ON public.lupg_sensus_snapshots FROM anon, authenticated;

-- Report ownership and submission audit data are immutable/server-derived.
CREATE OR REPLACE FUNCTION public.tg_lupg_monthly_report_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.kelompok_id IS DISTINCT FROM OLD.kelompok_id
     OR NEW.month IS DISTINCT FROM OLD.month
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Report identity fields are immutable';
  END IF;
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    NEW.submitted_at := now(); NEW.submitted_by := auth.uid();
  ELSIF NEW.status = 'draft' AND OLD.status = 'submitted' THEN
    NEW.submitted_at := NULL; NEW.submitted_by := NULL;
  ELSE
    NEW.submitted_at := OLD.submitted_at; NEW.submitted_by := OLD.submitted_by;
  END IF;
  IF public.user_role() = 'team_manager' THEN NEW.locked := OLD.locked; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_preserve_created_by()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.created_by := auth.uid();
  ELSE NEW.created_by := OLD.created_by; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tg_public_dashboard_shares_created_by ON public.public_dashboard_shares;
CREATE TRIGGER tg_public_dashboard_shares_created_by BEFORE INSERT OR UPDATE
  ON public.public_dashboard_shares FOR EACH ROW EXECUTE FUNCTION public.fn_preserve_created_by();
DROP TRIGGER IF EXISTS tg_lupg_character_target_templates_created_by ON public.lupg_character_target_templates;
CREATE TRIGGER tg_lupg_character_target_templates_created_by BEFORE INSERT OR UPDATE
  ON public.lupg_character_target_templates FOR EACH ROW EXECUTE FUNCTION public.fn_preserve_created_by();

-- Photo metadata and Storage objects are bound to the parent report's kelompok.
CREATE OR REPLACE FUNCTION public.lupg_activity_photo_path_matches_report(p_report_id uuid, p_path text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.lupg_monthly_reports mr
    WHERE mr.id = p_report_id AND split_part(p_path, '/', 1) = mr.kelompok_id::text);
$$;
DROP POLICY IF EXISTS lupg_activity_photos_insert ON public.lupg_activity_photos;
CREATE POLICY lupg_activity_photos_insert ON public.lupg_activity_photos FOR INSERT
  WITH CHECK (lupg_mr_writable(report_id)
    AND lupg_activity_photo_path_matches_report(report_id, storage_path));
DROP POLICY IF EXISTS lupg_activity_photos_update ON public.lupg_activity_photos;
CREATE POLICY lupg_activity_photos_update ON public.lupg_activity_photos FOR UPDATE
  USING (lupg_mr_writable(report_id))
  WITH CHECK (lupg_mr_writable(report_id)
    AND lupg_activity_photo_path_matches_report(report_id, storage_path));

DROP POLICY IF EXISTS "lupg activity photos readable" ON storage.objects;
CREATE POLICY "lupg activity photos readable" ON storage.objects FOR SELECT USING (
  bucket_id = 'lupg-activity-photos' AND EXISTS (
    SELECT 1 FROM public.lupg_activity_photos ap
    WHERE ap.storage_path = storage.objects.name AND public.lupg_mr_readable(ap.report_id)));
DROP POLICY IF EXISTS "lupg activity photos insertable" ON storage.objects;
CREATE POLICY "lupg activity photos insertable" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lupg-activity-photos' AND (
    user_role() IN ('super_admin', 'admin')
    OR (user_role() = 'team_manager' AND split_part(name, '/', 1) = user_kelompok_id()::text)));
DROP POLICY IF EXISTS "lupg activity photos updatable" ON storage.objects;
CREATE POLICY "lupg activity photos updatable" ON storage.objects FOR UPDATE USING (
  bucket_id = 'lupg-activity-photos' AND (
    user_role() IN ('super_admin', 'admin')
    OR (user_role() = 'team_manager' AND split_part(name, '/', 1) = user_kelompok_id()::text)))
  WITH CHECK (bucket_id = 'lupg-activity-photos' AND (
    user_role() IN ('super_admin', 'admin')
    OR (user_role() = 'team_manager' AND split_part(name, '/', 1) = user_kelompok_id()::text)));
DROP POLICY IF EXISTS "lupg activity photos deletable" ON storage.objects;
CREATE POLICY "lupg activity photos deletable" ON storage.objects FOR DELETE USING (
  bucket_id = 'lupg-activity-photos' AND (
    user_role() IN ('super_admin', 'admin')
    OR (user_role() = 'team_manager' AND split_part(name, '/', 1) = user_kelompok_id()::text)));

REVOKE ALL ON FUNCTION public.promote_eligible_gpn() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_eligible_gpn() TO service_role;

-- Remove historic plaintext password copies; Supabase Auth retains only hashes.
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data - 'temp_password'
WHERE raw_app_meta_data ? 'temp_password';
