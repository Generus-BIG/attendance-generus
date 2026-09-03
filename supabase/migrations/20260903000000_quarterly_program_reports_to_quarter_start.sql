-- Quarterly program data is stored against the first month of its quarter so
-- teams can record the quarter from its opening month.
ALTER TABLE public.lupg_program_reports
  DISABLE TRIGGER lupg_program_reports_availability;

WITH quarterly_rows AS (
  SELECT
    pr.id,
    mr.kelompok_id,
    date_trunc('quarter', mr.month)::date AS target_month,
    pr.program_code,
    pr.updated_at,
    row_number() OVER (
      PARTITION BY
        mr.kelompok_id,
        date_trunc('quarter', mr.month)::date,
        pr.program_code
      ORDER BY pr.updated_at DESC, pr.id DESC
    ) AS row_rank
  FROM public.lupg_program_reports pr
  JOIN public.lupg_monthly_reports mr ON mr.id = pr.monthly_report_id
  JOIN public.lupg_program_definitions pd ON pd.code = pr.program_code
  WHERE pd.reporting_style = 'quarterly'
)
INSERT INTO public.lupg_monthly_reports (kelompok_id, month, status)
SELECT DISTINCT kelompok_id, target_month, 'draft'
FROM quarterly_rows
ON CONFLICT (kelompok_id, month) DO NOTHING;

WITH ranked_rows AS (
  SELECT
    pr.id,
    mr.kelompok_id,
    date_trunc('quarter', mr.month)::date AS target_month,
    pr.program_code,
    row_number() OVER (
      PARTITION BY
        mr.kelompok_id,
        date_trunc('quarter', mr.month)::date,
        pr.program_code
      ORDER BY pr.updated_at DESC, pr.id DESC
    ) AS row_rank
  FROM public.lupg_program_reports pr
  JOIN public.lupg_monthly_reports mr ON mr.id = pr.monthly_report_id
  JOIN public.lupg_program_definitions pd ON pd.code = pr.program_code
  WHERE pd.reporting_style = 'quarterly'
)
DELETE FROM public.lupg_program_reports pr
USING ranked_rows ranked
WHERE pr.id = ranked.id
  AND ranked.row_rank > 1;

WITH quarterly_rows AS (
  SELECT
    pr.id,
    mr.kelompok_id,
    date_trunc('quarter', mr.month)::date AS target_month
  FROM public.lupg_program_reports pr
  JOIN public.lupg_monthly_reports mr ON mr.id = pr.monthly_report_id
  JOIN public.lupg_program_definitions pd ON pd.code = pr.program_code
  WHERE pd.reporting_style = 'quarterly'
)
UPDATE public.lupg_program_reports pr
SET monthly_report_id = target_report.id
FROM quarterly_rows source
JOIN public.lupg_monthly_reports target_report
  ON target_report.kelompok_id = source.kelompok_id
 AND target_report.month = source.target_month
WHERE pr.id = source.id
  AND pr.monthly_report_id <> target_report.id;

ALTER TABLE public.lupg_program_reports
  ENABLE TRIGGER lupg_program_reports_availability;
