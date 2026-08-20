CREATE OR REPLACE FUNCTION public.fn_lupg_phq_prevent_parent_kelompok_move()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.kelompok_id IS NOT DISTINCT FROM OLD.kelompok_id THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'lupg_phq_participants' THEN
    IF EXISTS (
      SELECT 1 FROM public.lupg_phq_progress WHERE participant_id = OLD.id
      UNION ALL
      SELECT 1 FROM public.lupg_phq_attendance WHERE participant_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Kelompok peserta PHQ tidak dapat diubah setelah memiliki progres atau kehadiran';
    END IF;
  ELSIF TG_TABLE_NAME = 'lupg_phq_meetings' THEN
    IF EXISTS (
      SELECT 1 FROM public.lupg_phq_progress WHERE meeting_id = OLD.id
      UNION ALL
      SELECT 1 FROM public.lupg_phq_attendance WHERE meeting_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Kelompok pertemuan PHQ tidak dapat diubah setelah memiliki progres atau kehadiran';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_lupg_phq_participants_prevent_kelompok_move
BEFORE UPDATE OF kelompok_id ON public.lupg_phq_participants
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_prevent_parent_kelompok_move();

CREATE TRIGGER tg_lupg_phq_meetings_prevent_kelompok_move
BEFORE UPDATE OF kelompok_id ON public.lupg_phq_meetings
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_phq_prevent_parent_kelompok_move();

REVOKE ALL ON FUNCTION public.fn_lupg_phq_prevent_parent_kelompok_move() FROM PUBLIC, anon, authenticated;
