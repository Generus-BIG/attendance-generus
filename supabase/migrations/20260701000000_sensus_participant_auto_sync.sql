-- =============================================================================
-- Sensus Generus: automatic participant sync for GPN_A, GPN_B, AR, APR
-- =============================================================================
-- Replaces the GPN-only derived view with one that covers all four participant
-- categories (GPN_A, GPN_B, AR, APR). Adds an AFTER trigger on participants so
-- the lupg_sensus table auto-syncs whenever status_active, category_id,
-- group_id, or gender changes. ACR, PENDIDIK_MT, PENDIDIK_MS remain manual.

-- 1. View: participant-derived sensus counts (SECURITY INVOKER, safe because
--    participants SELECT RLS allows all roles to see all rows)
DROP VIEW IF EXISTS public.lupg_sensus_gpn_derived;
DROP VIEW IF EXISTS public.lupg_sensus_participant_derived;

CREATE VIEW public.lupg_sensus_participant_derived
WITH (security_invoker = true) AS
SELECT
  p.group_id AS kelompok_id,
  CASE lv.value
    WHEN 'GPN A' THEN 'GPN_A'
    WHEN 'GPN B' THEN 'GPN_B'
    WHEN 'AR'    THEN 'AR'
    WHEN 'APR'   THEN 'APR'
  END AS category_code,
  p.gender,
  count(*)::integer AS count
FROM public.participants p
JOIN public.lookup_values lv ON lv.id = p.category_id
WHERE p.status_active = true
  AND lv.type = 'CATEGORY'
  AND lv.value IN ('GPN A', 'GPN B', 'AR', 'APR')
  AND p.gender IN ('L', 'P')
  AND p.group_id IS NOT NULL
GROUP BY p.group_id, lv.value, p.gender;

GRANT SELECT ON public.lupg_sensus_participant_derived TO anon, authenticated, service_role;

-- 2. Sync function: zero-out then upsert (handles count→0 when participants leave)
CREATE OR REPLACE FUNCTION public.lupg_sync_derived_sensus(p_kelompok_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.lupg_sensus
  SET count = 0, last_updated_at = now()
  WHERE kelompok_id = p_kelompok_id
    AND category_code IN ('GPN_A', 'GPN_B', 'AR', 'APR');

  INSERT INTO public.lupg_sensus (kelompok_id, category_code, gender, count)
  SELECT kelompok_id, category_code, gender, count
  FROM public.lupg_sensus_participant_derived
  WHERE kelompok_id = p_kelompok_id
  ON CONFLICT (kelompok_id, category_code, gender)
  DO UPDATE SET count = EXCLUDED.count, last_updated_at = now();
END;
$function$;

-- 3. Trigger: auto-sync on participant changes
CREATE OR REPLACE FUNCTION public.fn_participants_sync_sensus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
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

DROP TRIGGER IF EXISTS tg_participants_sync_sensus ON public.participants;

CREATE TRIGGER tg_participants_sync_sensus
AFTER INSERT OR UPDATE OF status_active, category_id, group_id, gender OR DELETE
ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.fn_participants_sync_sensus();

-- 4. Initial backfill for all existing kelompoks
DO $$
DECLARE k record;
BEGIN
  FOR k IN SELECT DISTINCT group_id FROM participants WHERE group_id IS NOT NULL LOOP
    PERFORM lupg_sync_derived_sensus(k.group_id);
  END LOOP;
END $$;
