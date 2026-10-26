BEGIN;

LOCK TABLE public.lupg_character_target_templates,
  public.lupg_character_target_items,
  public.lupg_character_target_reports IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  reports_before text;
  other_items_before text;
  acr_ids_before text;
BEGIN
  SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY r.id))
    INTO reports_before FROM public.lupg_character_target_reports r;
  SELECT md5(string_agg(to_jsonb(i)::text, '' ORDER BY i.id))
    INTO other_items_before FROM public.lupg_character_target_items i
    WHERE i.level_code IN ('APR', 'AR', 'GPN');
  SELECT md5(string_agg(id::text, '' ORDER BY id)) INTO acr_ids_before
    FROM public.lupg_character_target_items WHERE level_code = 'ACR';

  ALTER TABLE public.lupg_character_target_templates
    DROP CONSTRAINT lupg_character_target_templates_level_code_check;
  ALTER TABLE public.lupg_character_target_items
    DROP CONSTRAINT lupg_character_target_items_level_check;

  -- Preserve item IDs so every saved percentage and note keeps its report link.
  UPDATE public.lupg_character_target_templates
    SET level_code = 'PAUD', name = regexp_replace(name, '\mACR\M', 'PAUD', 'g')
    WHERE level_code = 'ACR';
  UPDATE public.lupg_character_target_items
    SET level_code = 'PAUD' WHERE level_code = 'ACR';

  ALTER TABLE public.lupg_character_target_templates
    ALTER COLUMN level_code SET DEFAULT 'PAUD',
    ADD CONSTRAINT lupg_character_target_templates_level_code_check
      CHECK (level_code IN ('PAUD', 'ACR_1', 'ACR_2', 'ACR_3', 'ACR_4', 'ACR_5', 'ACR_6', 'APR', 'AR', 'GPN'));
  ALTER TABLE public.lupg_character_target_items
    ADD CONSTRAINT lupg_character_target_items_level_check
      CHECK (level_code IN ('PAUD', 'ACR_1', 'ACR_2', 'ACR_3', 'ACR_4', 'ACR_5', 'ACR_6', 'APR', 'AR', 'GPN'));

  IF reports_before IS DISTINCT FROM (
    SELECT md5(string_agg(to_jsonb(r)::text, '' ORDER BY r.id))
      FROM public.lupg_character_target_reports r
  ) THEN RAISE EXCEPTION 'Target report values changed during level migration'; END IF;
  IF other_items_before IS DISTINCT FROM (
    SELECT md5(string_agg(to_jsonb(i)::text, '' ORDER BY i.id))
      FROM public.lupg_character_target_items i WHERE i.level_code IN ('APR', 'AR', 'GPN')
  ) THEN RAISE EXCEPTION 'APR/AR/GPN materials changed during level migration'; END IF;
  IF acr_ids_before IS NOT NULL AND acr_ids_before IS DISTINCT FROM (
    SELECT md5(string_agg(id::text, '' ORDER BY id))
      FROM public.lupg_character_target_items WHERE level_code = 'PAUD'
  ) THEN RAISE EXCEPTION 'ACR item IDs were not preserved as PAUD'; END IF;
END;
$$;

COMMIT;
