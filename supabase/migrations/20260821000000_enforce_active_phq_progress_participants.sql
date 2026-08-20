CREATE OR REPLACE FUNCTION public.fn_lupg_phq_validate_scope()
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

  IF TG_TABLE_NAME = 'lupg_phq_progress' AND NOT EXISTS (
    SELECT 1
    FROM public.lupg_phq_participants
    WHERE id = NEW.participant_id
      AND status_active
  ) THEN
    RAISE EXCEPTION 'Progres hafalan hanya dapat dicatat untuk peserta PHQ aktif';
  END IF;

  RETURN NEW;
END;
$$;
