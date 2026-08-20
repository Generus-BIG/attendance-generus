CREATE OR REPLACE FUNCTION public.fn_lupg_phq_assert_scope_at_commit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  lock_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('lupg_phq_progress', 'lupg_phq_attendance') THEN
    IF TG_OP = 'UPDATE'
      AND NEW.participant_id IS NOT DISTINCT FROM OLD.participant_id
      AND NEW.meeting_id IS NOT DISTINCT FROM OLD.meeting_id THEN
      RETURN NEW;
    END IF;

    FOR lock_id IN
      SELECT id
      FROM (VALUES (NEW.participant_id), (NEW.meeting_id)) AS locks(id)
      ORDER BY id
    LOOP
      PERFORM pg_advisory_xact_lock(hashtextextended(lock_id::text, 20260820));
    END LOOP;

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

    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 20260820));

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

    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 20260820));

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

REVOKE ALL ON FUNCTION public.fn_lupg_phq_assert_scope_at_commit() FROM PUBLIC, anon, authenticated;
