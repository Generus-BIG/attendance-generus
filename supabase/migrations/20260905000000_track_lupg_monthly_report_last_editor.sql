ALTER TABLE public.lupg_monthly_reports
  ADD COLUMN last_edited_at timestamptz,
  ADD COLUMN last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.fn_lupg_touch_monthly_report_from_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_report_id uuid := (v_row ->> TG_ARGV[0])::uuid;
BEGIN
  UPDATE public.lupg_monthly_reports
  SET last_edited_at = now(), last_edited_by = auth.uid()
  WHERE id = v_report_id;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER lupg_program_reports_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_program_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('monthly_report_id');

CREATE TRIGGER lupg_metric_reports_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_metric_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('monthly_report_id');

CREATE TRIGGER lupg_sarpras_reports_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_sarpras_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('monthly_report_id');

CREATE TRIGGER lupg_shodaqoh_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_shodaqoh
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('monthly_report_id');

CREATE TRIGGER lupg_mustin_notes_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_mustin_notes
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('monthly_report_id');

CREATE TRIGGER lupg_character_monitoring_reports_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_character_monitoring_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('monthly_report_id');

CREATE TRIGGER lupg_character_target_reports_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_character_target_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('monthly_report_id');

CREATE TRIGGER lupg_activity_photos_touch_monthly_report
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_activity_photos
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_touch_monthly_report_from_content('report_id');

CREATE OR REPLACE FUNCTION public.lupg_touch_monthly_report(p_report_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.lupg_monthly_reports
  SET last_edited_at = now(), last_edited_by = auth.uid()
  WHERE id = p_report_id;
$$;

REVOKE ALL ON FUNCTION public.lupg_touch_monthly_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_touch_monthly_report(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_lupg_touch_monthly_report_from_content() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lupg_get_last_editor_display(p_report_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(u.raw_user_meta_data ->> 'full_name', u.email)
  FROM public.lupg_monthly_reports mr
  JOIN auth.users u ON u.id = mr.last_edited_by
  WHERE mr.id = p_report_id
    AND auth.uid() IS NOT NULL
    AND public.lupg_mr_readable(mr.id);
$$;

REVOKE ALL ON FUNCTION public.lupg_get_last_editor_display(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_get_last_editor_display(uuid) TO authenticated;

CREATE INDEX idx_lupg_monthly_reports_last_edited_by
  ON public.lupg_monthly_reports (last_edited_by);

CREATE OR REPLACE FUNCTION public.lupg_upsert_sensus_for_report(
  p_report_id uuid,
  p_category_code text,
  p_gender text,
  p_count integer
)
RETURNS public.lupg_sensus
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_kelompok_id uuid;
  v_sensus public.lupg_sensus;
BEGIN
  IF p_count < 0 THEN
    RAISE EXCEPTION 'Jumlah sensus tidak boleh negatif';
  END IF;

  SELECT kelompok_id INTO v_kelompok_id
  FROM public.lupg_monthly_reports
  WHERE id = p_report_id
    AND public.lupg_mr_writable(id);

  IF v_kelompok_id IS NULL THEN
    RAISE EXCEPTION 'Laporan tidak ditemukan atau tidak dapat diedit';
  END IF;

  INSERT INTO public.lupg_sensus (
    kelompok_id,
    category_code,
    gender,
    count,
    last_updated_at,
    updated_by
  )
  VALUES (
    v_kelompok_id,
    p_category_code,
    p_gender,
    p_count,
    now(),
    auth.uid()
  )
  ON CONFLICT (kelompok_id, category_code, gender)
  DO UPDATE SET
    count = EXCLUDED.count,
    last_updated_at = EXCLUDED.last_updated_at,
    updated_by = EXCLUDED.updated_by
  RETURNING * INTO v_sensus;

  PERFORM public.lupg_touch_monthly_report(p_report_id);
  RETURN v_sensus;
END;
$$;

REVOKE ALL ON FUNCTION public.lupg_upsert_sensus_for_report(uuid, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_upsert_sensus_for_report(uuid, text, text, integer)
  TO authenticated;
