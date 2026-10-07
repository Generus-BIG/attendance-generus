ALTER TABLE public.lupg_monthly_reports
  ADD CONSTRAINT lupg_monthly_reports_submitted_mustin_attendance
  CHECK (
    status <> 'submitted'
    OR (mustin_attendance_kk IS NOT NULL AND mustin_sensus_kk IS NOT NULL)
  ) NOT VALID;
