DROP TRIGGER IF EXISTS tg_lupg_phq_progress_validate_scope ON public.lupg_phq_progress;
DROP TRIGGER IF EXISTS tg_lupg_phq_attendance_validate_scope ON public.lupg_phq_attendance;
DROP TRIGGER IF EXISTS tg_lupg_phq_participants_prevent_kelompok_move ON public.lupg_phq_participants;
DROP TRIGGER IF EXISTS tg_lupg_phq_meetings_prevent_kelompok_move ON public.lupg_phq_meetings;

DROP FUNCTION IF EXISTS public.fn_lupg_phq_validate_scope();
DROP FUNCTION IF EXISTS public.fn_lupg_phq_prevent_parent_kelompok_move();

CREATE FUNCTION public.fn_lupg_phq_assert_scope_at_commit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('lupg_phq_progress', 'lupg_phq_attendance') THEN
    IF TG_OP = 'UPDATE'
      AND NEW.participant_id IS NOT DISTINCT FROM OLD.participant_id
      AND NEW.meeting_id IS NOT DISTINCT FROM OLD.meeting_id THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.lupg_phq_participants p
      JOIN public.lupg_phq_meetings m ON m.id = NEW.meeting_id
      WHERE p.id = NEW.participant_id
        AND p.kelompok_id IS DISTINCT FROM m.kelompok_id
    ) THEN
      RAISE EXCEPTION 'Peserta PHQ harus berasal dari kelompok pertemuan yang sama';
    END IF;
  ELSIF TG_TABLE_NAME = 'lupg_phq_participants' THEN
    IF NEW.kelompok_id IS NOT DISTINCT FROM OLD.kelompok_id THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.lupg_phq_progress progress
      JOIN public.lupg_phq_meetings m ON m.id = progress.meeting_id
      WHERE progress.participant_id = NEW.id
        AND NEW.kelompok_id IS DISTINCT FROM m.kelompok_id
      UNION ALL
      SELECT 1
      FROM public.lupg_phq_attendance attendance
      JOIN public.lupg_phq_meetings m ON m.id = attendance.meeting_id
      WHERE attendance.participant_id = NEW.id
        AND NEW.kelompok_id IS DISTINCT FROM m.kelompok_id
    ) THEN
      RAISE EXCEPTION 'Kelompok peserta PHQ tidak boleh membuat progres atau kehadiran lintas kelompok';
    END IF;
  ELSIF TG_TABLE_NAME = 'lupg_phq_meetings' THEN
    IF NEW.kelompok_id IS NOT DISTINCT FROM OLD.kelompok_id THEN
      RETURN NEW;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.lupg_phq_progress progress
      JOIN public.lupg_phq_participants p ON p.id = progress.participant_id
      WHERE progress.meeting_id = NEW.id
        AND p.kelompok_id IS DISTINCT FROM NEW.kelompok_id
      UNION ALL
      SELECT 1
      FROM public.lupg_phq_attendance attendance
      JOIN public.lupg_phq_participants p ON p.id = attendance.participant_id
      WHERE attendance.meeting_id = NEW.id
        AND p.kelompok_id IS DISTINCT FROM NEW.kelompok_id
    ) THEN
      RAISE EXCEPTION 'Kelompok pertemuan PHQ tidak boleh membuat progres atau kehadiran lintas kelompok';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER ct_lupg_phq_progress_scope
AFTER INSERT OR UPDATE ON public.lupg_phq_progress
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_assert_scope_at_commit();

CREATE CONSTRAINT TRIGGER ct_lupg_phq_attendance_scope
AFTER INSERT OR UPDATE ON public.lupg_phq_attendance
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_assert_scope_at_commit();

CREATE CONSTRAINT TRIGGER ct_lupg_phq_participants_scope
AFTER UPDATE ON public.lupg_phq_participants
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_assert_scope_at_commit();

CREATE CONSTRAINT TRIGGER ct_lupg_phq_meetings_scope
AFTER UPDATE ON public.lupg_phq_meetings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_assert_scope_at_commit();

REVOKE ALL ON FUNCTION public.fn_lupg_phq_assert_scope_at_commit() FROM PUBLIC, anon, authenticated;
