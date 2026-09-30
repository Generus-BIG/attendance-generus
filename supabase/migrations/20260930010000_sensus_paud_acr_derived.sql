-- =============================================================================
-- Sensus: PAUD and ACR now derive from participants
-- =============================================================================
-- Only Pendidik MT/MS remain manual. PAUD and ACR have real participant rows,
-- so they join GPN_A/GPN_B/AR/APR as participant-derived categories: the view
-- gains both mappings and the sync function keeps their lupg_sensus rows
-- (used by monthly-report submit snapshots) in step. Backfill overwrites the
-- manual PAUD/ACR numbers with live participant counts.

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
    WHEN 'Paud'  THEN 'PAUD'
    WHEN 'ACR'   THEN 'ACR'
  END AS category_code,
  p.gender,
  count(*)::integer AS count
FROM public.participants p
JOIN public.lookup_values lv ON lv.id = p.category_id
WHERE p.status_active = true
  AND lv.type = 'CATEGORY'
  AND lv.value IN ('GPN A', 'GPN B', 'AR', 'APR', 'Paud', 'ACR')
  AND p.gender IN ('L', 'P')
  AND p.group_id IS NOT NULL
GROUP BY p.group_id, lv.value, p.gender;

GRANT SELECT ON public.lupg_sensus_participant_derived TO anon, authenticated, service_role;

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
    AND category_code IN ('GPN_A', 'GPN_B', 'AR', 'APR', 'PAUD', 'ACR');

  INSERT INTO public.lupg_sensus (kelompok_id, category_code, gender, count)
  SELECT kelompok_id, category_code, gender, count
  FROM public.lupg_sensus_participant_derived
  WHERE kelompok_id = p_kelompok_id
  ON CONFLICT (kelompok_id, category_code, gender)
  DO UPDATE SET count = EXCLUDED.count, last_updated_at = now();
END;
$function$;

-- Backfill all kelompoks: overwrites manual PAUD/ACR numbers with the
-- participant-derived counts.
DO $$
DECLARE k record;
BEGIN
  FOR k IN SELECT DISTINCT group_id FROM participants WHERE group_id IS NOT NULL LOOP
    PERFORM lupg_sync_derived_sensus(k.group_id);
  END LOOP;
END $$;
