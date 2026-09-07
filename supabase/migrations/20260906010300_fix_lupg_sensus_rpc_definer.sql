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

REVOKE ALL ON FUNCTION public.fn_lupg_record_monthly_report_edit(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lupg_upsert_sensus_for_report(uuid, text, text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_upsert_sensus_for_report(uuid, text, text, integer)
  TO authenticated;
