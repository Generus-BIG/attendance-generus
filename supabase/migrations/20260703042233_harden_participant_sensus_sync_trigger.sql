-- =============================================================================
-- Harden participant-derived LUPG sensus sync trigger
-- =============================================================================
-- Participant writes run as authenticated users, but the derived sensus sync
-- helper is intentionally not directly executable by those users. Run the
-- trigger wrapper as its owner so participant inserts/updates/deletes can sync
-- sensus counts without exposing the SECURITY DEFINER helper as a public RPC.

CREATE OR REPLACE FUNCTION public.fn_participants_sync_sensus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.group_id IS NOT NULL THEN
      PERFORM public.lupg_sync_derived_sensus(OLD.group_id);
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.group_id IS NOT NULL THEN
    PERFORM public.lupg_sync_derived_sensus(NEW.group_id);
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.group_id IS NOT NULL
     AND OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    PERFORM public.lupg_sync_derived_sensus(OLD.group_id);
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_participants_sync_sensus() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lupg_sync_derived_sensus(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_participants_sync_sensus() TO service_role;
GRANT EXECUTE ON FUNCTION public.lupg_sync_derived_sensus(uuid) TO service_role;
