ALTER TABLE public.lupg_monthly_reports
  ADD COLUMN mustin_attendance_kk integer,
  ADD COLUMN mustin_sensus_kk integer,
  ADD COLUMN mustin_attendance_percent numeric GENERATED ALWAYS AS (
    CASE
      WHEN mustin_attendance_kk IS NULL
        OR mustin_sensus_kk IS NULL
        OR mustin_sensus_kk = 0 THEN NULL
      ELSE round(mustin_attendance_kk::numeric * 100 / mustin_sensus_kk, 1)
    END
  ) STORED,
  ADD CONSTRAINT lupg_monthly_reports_mustin_attendance_nonnegative
    CHECK (mustin_attendance_kk IS NULL OR mustin_attendance_kk >= 0),
  ADD CONSTRAINT lupg_monthly_reports_mustin_sensus_nonnegative
    CHECK (mustin_sensus_kk IS NULL OR mustin_sensus_kk >= 0),
  ADD CONSTRAINT lupg_monthly_reports_mustin_attendance_within_sensus
    CHECK (
      mustin_attendance_kk IS NULL
      OR mustin_sensus_kk IS NULL
      OR mustin_attendance_kk <= mustin_sensus_kk
    );

CREATE OR REPLACE FUNCTION public.tg_lupg_monthly_report_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.kelompok_id IS DISTINCT FROM OLD.kelompok_id
     OR NEW.month IS DISTINCT FROM OLD.month
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Report identity fields are immutable';
  END IF;

  IF NEW.mustin_attendance_kk IS DISTINCT FROM OLD.mustin_attendance_kk
     OR NEW.mustin_sensus_kk IS DISTINCT FROM OLD.mustin_sensus_kk THEN
    NEW.last_edited_at := now();
    NEW.last_edited_by := auth.uid();
  END IF;

  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    IF NULLIF(btrim(NEW.submitted_by_label), '') IS NULL THEN
      RAISE EXCEPTION 'Submission editor label is required';
    END IF;
    IF NEW.mustin_attendance_kk IS NULL OR NEW.mustin_sensus_kk IS NULL THEN
      RAISE EXCEPTION 'Mustin attendance is required';
    END IF;
    IF NEW.mustin_attendance_kk < 0
       OR NEW.mustin_sensus_kk < 0
       OR NEW.mustin_attendance_kk > NEW.mustin_sensus_kk THEN
      RAISE EXCEPTION 'Mustin attendance must be between zero and the Mustin census';
    END IF;
    NEW.submitted_by_label := btrim(NEW.submitted_by_label);
    NEW.submitted_at := now(); NEW.submitted_by := auth.uid();
  ELSIF NEW.status = 'draft' AND OLD.status = 'submitted' THEN
    NEW.submitted_at := NULL; NEW.submitted_by := NULL; NEW.submitted_by_label := NULL;
  ELSE
    NEW.submitted_at := OLD.submitted_at; NEW.submitted_by := OLD.submitted_by;
    NEW.submitted_by_label := OLD.submitted_by_label;
  END IF;
  IF public.user_role() = 'team_manager' THEN NEW.locked := OLD.locked; END IF;
  RETURN NEW;
END;
$$;
