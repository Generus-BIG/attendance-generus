-- Preserve sensus-sync audit history without blocking participant deletion.
ALTER TABLE public.sensus_sync_items
  ADD COLUMN deleted_participant_id uuid;

CREATE OR REPLACE FUNCTION public.fn_sensus_sync_record_deleted_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.sensus_sync_items
  SET deleted_participant_id = OLD.id
  WHERE matched_participant_id = OLD.id;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_sensus_sync_record_deleted_participant()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tg_sensus_sync_record_deleted_participant
BEFORE DELETE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.fn_sensus_sync_record_deleted_participant();

ALTER TABLE public.sensus_sync_items
  DROP CONSTRAINT sensus_sync_items_matched_participant_id_fkey,
  ADD CONSTRAINT sensus_sync_items_matched_participant_id_fkey
    FOREIGN KEY (matched_participant_id)
    REFERENCES public.participants (id)
    ON DELETE SET NULL;

ALTER TABLE public.sensus_sync_items
  DROP CONSTRAINT sensus_sync_items_applied_match_resolved,
  ADD CONSTRAINT sensus_sync_items_applied_match_resolved
  CHECK (
    status <> 'applied'
    OR matched_participant_id IS NOT NULL
    OR deleted_participant_id IS NOT NULL
    OR jsonb_array_length(COALESCE(patch -> 'candidates', '[]'::jsonb)) = 0
  ) NOT VALID;
