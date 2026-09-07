ALTER TABLE public.lupg_monthly_reports
  ADD COLUMN submitted_by_label text;

ALTER TABLE public.lupg_monthly_reports
  ADD CONSTRAINT lupg_monthly_reports_submitted_by_label_length
  CHECK (submitted_by_label IS NULL OR char_length(btrim(submitted_by_label)) BETWEEN 1 AND 100);

CREATE OR REPLACE FUNCTION public.tg_lupg_monthly_report_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.kelompok_id IS DISTINCT FROM OLD.kelompok_id
     OR NEW.month IS DISTINCT FROM OLD.month
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Report identity fields are immutable';
  END IF;
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
    IF NULLIF(btrim(NEW.submitted_by_label), '') IS NULL THEN
      RAISE EXCEPTION 'Submission editor label is required';
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
