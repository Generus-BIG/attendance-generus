CREATE OR REPLACE FUNCTION public.fn_lupg_intensif_attendance_snapshot_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['status', 'updated_at'])
    IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN
    RAISE EXCEPTION 'Hanya status kehadiran Intensif yang dapat diubah';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_lupg_intensif_attendance_snapshot_immutable() FROM PUBLIC, anon, authenticated;
