CREATE TABLE public.lupg_monthly_report_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_report_id uuid NOT NULL REFERENCES public.lupg_monthly_reports(id) ON DELETE CASCADE,
  kelompok_id uuid NOT NULL REFERENCES public.lookup_values(id),
  edited_at timestamptz NOT NULL DEFAULT now(),
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_table text NOT NULL CHECK (char_length(source_table) BETWEEN 1 AND 100),
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_lupg_report_history_report_time
  ON public.lupg_monthly_report_edit_history (monthly_report_id, edited_at DESC);
CREATE INDEX idx_lupg_report_history_kelompok_time
  ON public.lupg_monthly_report_edit_history (kelompok_id, edited_at DESC);

ALTER TABLE public.lupg_monthly_report_edit_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lupg_monthly_report_edit_history FROM anon, authenticated;
GRANT SELECT ON public.lupg_monthly_report_edit_history TO authenticated;
CREATE POLICY lupg_monthly_report_edit_history_select
  ON public.lupg_monthly_report_edit_history
  FOR SELECT TO authenticated
  USING (public.lupg_mr_readable(monthly_report_id));

CREATE OR REPLACE FUNCTION public.fn_lupg_record_monthly_report_edit(
  p_report_id uuid,
  p_source_table text,
  p_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kelompok_id uuid;
BEGIN
  SELECT kelompok_id INTO v_kelompok_id
  FROM public.lupg_monthly_reports
  WHERE id = p_report_id;

  IF v_kelompok_id IS NULL THEN
    RAISE EXCEPTION 'Monthly report not found for edit history';
  END IF;

  INSERT INTO public.lupg_monthly_report_edit_history
    (monthly_report_id, kelompok_id, edited_by, source_table, action)
  VALUES
    (p_report_id, v_kelompok_id, auth.uid(), p_source_table, p_action);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_lupg_record_monthly_report_edit(uuid, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_lupg_log_monthly_report_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
BEGIN
  PERFORM public.fn_lupg_record_monthly_report_edit(
    (v_row ->> TG_ARGV[0])::uuid, TG_TABLE_NAME, TG_OP
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_lupg_log_monthly_report_edit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER lupg_program_reports_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_program_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('monthly_report_id');
CREATE TRIGGER lupg_metric_reports_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_metric_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('monthly_report_id');
CREATE TRIGGER lupg_sarpras_reports_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_sarpras_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('monthly_report_id');
CREATE TRIGGER lupg_shodaqoh_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_shodaqoh
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('monthly_report_id');
CREATE TRIGGER lupg_mustin_notes_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_mustin_notes
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('monthly_report_id');
CREATE TRIGGER lupg_character_monitoring_reports_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_character_monitoring_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('monthly_report_id');
CREATE TRIGGER lupg_character_target_reports_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_character_target_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('monthly_report_id');
CREATE TRIGGER lupg_activity_photos_history
AFTER INSERT OR UPDATE OR DELETE ON public.lupg_activity_photos
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_edit('report_id');

DROP FUNCTION IF EXISTS public.lupg_get_monthly_report_edit_history(uuid);

CREATE OR REPLACE FUNCTION public.lupg_get_monthly_report_edit_history(
  p_report_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  monthly_report_id uuid,
  kelompok_id uuid,
  edited_at timestamptz,
  edited_by uuid,
  source_table text,
  action text,
  editor_display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT h.id, h.monthly_report_id, h.kelompok_id, h.edited_at,
         h.edited_by, h.source_table, h.action,
         COALESCE(u.raw_user_meta_data ->> 'full_name', u.email) AS editor_display_name
  FROM public.lupg_monthly_report_edit_history h
  LEFT JOIN auth.users u ON u.id = h.edited_by
  WHERE h.monthly_report_id = p_report_id
    AND public.lupg_mr_readable(h.monthly_report_id)
  ORDER BY h.edited_at DESC, h.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.lupg_get_monthly_report_edit_history(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_get_monthly_report_edit_history(uuid, integer) TO authenticated;

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
    kelompok_id, category_code, gender, count, last_updated_at, updated_by
  )
  VALUES (
    v_kelompok_id, p_category_code, p_gender, p_count, now(), auth.uid()
  )
  ON CONFLICT (kelompok_id, category_code, gender)
  DO UPDATE SET
    count = EXCLUDED.count,
    last_updated_at = EXCLUDED.last_updated_at,
    updated_by = EXCLUDED.updated_by
  RETURNING * INTO v_sensus;

  PERFORM public.lupg_touch_monthly_report(p_report_id);

  PERFORM public.fn_lupg_record_monthly_report_edit(p_report_id, 'sensus', 'UPDATE');

  RETURN v_sensus;
END;
$$;

REVOKE ALL ON FUNCTION public.lupg_upsert_sensus_for_report(uuid, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_upsert_sensus_for_report(uuid, text, text, integer)
  TO authenticated;
