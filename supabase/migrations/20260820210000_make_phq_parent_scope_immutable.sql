DROP TRIGGER IF EXISTS ct_lupg_phq_progress_scope ON public.lupg_phq_progress;
DROP TRIGGER IF EXISTS ct_lupg_phq_attendance_scope ON public.lupg_phq_attendance;
DROP TRIGGER IF EXISTS ct_lupg_phq_participants_scope ON public.lupg_phq_participants;
DROP TRIGGER IF EXISTS ct_lupg_phq_meetings_scope ON public.lupg_phq_meetings;

DROP FUNCTION IF EXISTS public.fn_lupg_phq_assert_scope_at_commit();

CREATE FUNCTION public.fn_lupg_phq_parent_kelompok_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.kelompok_id IS DISTINCT FROM OLD.kelompok_id THEN
    RAISE EXCEPTION 'Kelompok PHQ tidak dapat diubah setelah dibuat';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.fn_lupg_phq_validate_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.lupg_phq_participants p
    JOIN public.lupg_phq_meetings m ON m.id = NEW.meeting_id
    WHERE p.id = NEW.participant_id
      AND p.kelompok_id = m.kelompok_id
  ) THEN
    RAISE EXCEPTION 'Peserta PHQ harus berasal dari kelompok pertemuan yang sama';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_lupg_phq_participants_kelompok_immutable
BEFORE UPDATE OF kelompok_id ON public.lupg_phq_participants
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_parent_kelompok_immutable();

CREATE TRIGGER tg_lupg_phq_meetings_kelompok_immutable
BEFORE UPDATE OF kelompok_id ON public.lupg_phq_meetings
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_parent_kelompok_immutable();

CREATE TRIGGER tg_lupg_phq_progress_validate_scope
BEFORE INSERT OR UPDATE OF participant_id, meeting_id ON public.lupg_phq_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_validate_scope();

CREATE TRIGGER tg_lupg_phq_attendance_validate_scope
BEFORE INSERT OR UPDATE OF participant_id, meeting_id ON public.lupg_phq_attendance
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_validate_scope();

REVOKE ALL ON FUNCTION public.fn_lupg_phq_parent_kelompok_immutable(), public.fn_lupg_phq_validate_scope() FROM PUBLIC, anon, authenticated;
