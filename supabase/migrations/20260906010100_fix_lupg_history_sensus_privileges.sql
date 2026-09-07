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

CREATE OR REPLACE FUNCTION public.lupg_upsert_sensus_for_report(
  p_report_id pg_catalog.uuid,
  p_category_code pg_catalog.text,
  p_gender pg_catalog.text,
  p_count pg_catalog.int4
)
RETURNS public.lupg_sensus
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_kelompok_id pg_catalog.uuid;
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
    v_kelompok_id, p_category_code, p_gender, p_count, pg_catalog.now(), auth.uid()
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
