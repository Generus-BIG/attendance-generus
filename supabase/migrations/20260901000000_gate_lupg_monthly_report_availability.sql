CREATE OR REPLACE FUNCTION public.fn_lupg_guard_monthly_report_availability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  v_available_month date := date_trunc('month', v_today)::date;
BEGIN
  IF EXTRACT(DAY FROM v_today) < 8 THEN
    v_available_month := (v_available_month - INTERVAL '1 month')::date;
  END IF;

  IF NEW.month > v_available_month THEN
    RAISE EXCEPTION 'Laporan bulan ini tersedia mulai tanggal 8';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_lupg_guard_monthly_report_content_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  v_available_month date := date_trunc('month', v_today)::date;
  v_report_id uuid;
  v_row jsonb;
  v_month date;
BEGIN
  IF EXTRACT(DAY FROM v_today) < 8 THEN
    v_available_month := (v_available_month - INTERVAL '1 month')::date;
  END IF;

  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_report_id := (v_row ->> TG_ARGV[0])::uuid;

  SELECT month INTO v_month
  FROM public.lupg_monthly_reports
  WHERE id = v_report_id;

  IF v_month > v_available_month THEN
    RAISE EXCEPTION 'Laporan bulan ini tersedia mulai tanggal 8';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS lupg_monthly_report_before_insert_availability
  ON public.lupg_monthly_reports;
CREATE TRIGGER lupg_monthly_report_before_insert_availability
BEFORE INSERT ON public.lupg_monthly_reports
FOR EACH ROW
EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_availability();

DROP TRIGGER IF EXISTS lupg_monthly_report_before_update_availability
  ON public.lupg_monthly_reports;
CREATE TRIGGER lupg_monthly_report_before_update_availability
BEFORE UPDATE ON public.lupg_monthly_reports
FOR EACH ROW
EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_availability();

DROP TRIGGER IF EXISTS lupg_program_reports_availability ON public.lupg_program_reports;
CREATE TRIGGER lupg_program_reports_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_program_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('monthly_report_id');

DROP TRIGGER IF EXISTS lupg_metric_reports_availability ON public.lupg_metric_reports;
CREATE TRIGGER lupg_metric_reports_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_metric_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('monthly_report_id');

DROP TRIGGER IF EXISTS lupg_sarpras_reports_availability ON public.lupg_sarpras_reports;
CREATE TRIGGER lupg_sarpras_reports_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_sarpras_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('monthly_report_id');

DROP TRIGGER IF EXISTS lupg_shodaqoh_availability ON public.lupg_shodaqoh;
CREATE TRIGGER lupg_shodaqoh_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_shodaqoh
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('monthly_report_id');

DROP TRIGGER IF EXISTS lupg_mustin_notes_availability ON public.lupg_mustin_notes;
CREATE TRIGGER lupg_mustin_notes_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_mustin_notes
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('monthly_report_id');

DROP TRIGGER IF EXISTS lupg_character_monitoring_reports_availability ON public.lupg_character_monitoring_reports;
CREATE TRIGGER lupg_character_monitoring_reports_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_character_monitoring_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('monthly_report_id');

DROP TRIGGER IF EXISTS lupg_character_target_reports_availability ON public.lupg_character_target_reports;
CREATE TRIGGER lupg_character_target_reports_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_character_target_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('monthly_report_id');

DROP TRIGGER IF EXISTS lupg_activity_photos_availability ON public.lupg_activity_photos;
CREATE TRIGGER lupg_activity_photos_availability
BEFORE INSERT OR UPDATE OR DELETE ON public.lupg_activity_photos
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_guard_monthly_report_content_availability('report_id');

REVOKE ALL ON FUNCTION public.fn_lupg_guard_monthly_report_content_availability() FROM PUBLIC, anon, authenticated;
