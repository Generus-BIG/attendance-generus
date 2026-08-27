CREATE OR REPLACE FUNCTION public.fn_lupg_phq_validate_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_first_id uuid;
  v_second_id uuid;
BEGIN
  v_first_id := LEAST(NEW.participant_id, NEW.meeting_id);
  v_second_id := GREATEST(NEW.participant_id, NEW.meeting_id);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_first_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(v_second_id::text, 0));

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

  PERFORM pg_advisory_xact_lock(hashtextextended(OLD.id::text, 0));

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

REVOKE ALL ON FUNCTION public.fn_lupg_phq_validate_scope(), public.fn_lupg_phq_prevent_parent_kelompok_move() FROM PUBLIC, anon, authenticated;
