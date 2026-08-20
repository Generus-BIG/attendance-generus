ALTER TABLE public.lupg_phq_progress
  DROP CONSTRAINT lupg_phq_progress_participant_id_fkey,
  ADD CONSTRAINT lupg_phq_progress_participant_id_fkey
    FOREIGN KEY (participant_id)
    REFERENCES public.lupg_phq_participants(id)
    ON DELETE CASCADE;

ALTER TABLE public.lupg_phq_attendance
  DROP CONSTRAINT lupg_phq_attendance_participant_id_fkey,
  ADD CONSTRAINT lupg_phq_attendance_participant_id_fkey
    FOREIGN KEY (participant_id)
    REFERENCES public.lupg_phq_participants(id)
    ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.fn_lupg_intensif_attendance_snapshot_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.activity_id IS DISTINCT FROM OLD.activity_id
    OR NEW.participant_id IS DISTINCT FROM OLD.participant_id
    OR NEW.participant_name IS DISTINCT FROM OLD.participant_name
    OR NEW.participant_gender IS DISTINCT FROM OLD.participant_gender
    OR NEW.participant_category_code IS DISTINCT FROM OLD.participant_category_code
    OR NEW.notes IS DISTINCT FROM OLD.notes THEN
    RAISE EXCEPTION 'Hanya status kehadiran Intensif yang dapat diubah';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_lupg_intensif_attendance_snapshot_immutable
BEFORE UPDATE ON public.lupg_intensif_attendance
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_intensif_attendance_snapshot_immutable();

CREATE OR REPLACE FUNCTION public.fn_lupg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_lupg_set_updated_at
BEFORE UPDATE ON public.lupg_phq_participants
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_set_updated_at();

CREATE TRIGGER tg_lupg_set_updated_at
BEFORE UPDATE ON public.lupg_phq_meetings
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_set_updated_at();

CREATE TRIGGER tg_lupg_set_updated_at
BEFORE UPDATE ON public.lupg_phq_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_set_updated_at();

CREATE TRIGGER tg_lupg_set_updated_at
BEFORE UPDATE ON public.lupg_phq_attendance
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_set_updated_at();

CREATE TRIGGER tg_lupg_set_updated_at
BEFORE UPDATE ON public.lupg_phq_monthly_notes
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_set_updated_at();

CREATE TRIGGER tg_lupg_set_updated_at
BEFORE UPDATE ON public.lupg_intensif_activities
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_set_updated_at();

CREATE TRIGGER tg_lupg_set_updated_at
BEFORE UPDATE ON public.lupg_intensif_attendance
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_set_updated_at();

REVOKE ALL ON FUNCTION public.fn_lupg_intensif_attendance_snapshot_immutable(), public.fn_lupg_set_updated_at() FROM PUBLIC, anon, authenticated;
