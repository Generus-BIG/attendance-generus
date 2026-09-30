-- =============================================================================
-- Sensus sync: auto-map sole similar candidates in existing runs
-- =============================================================================
-- New runs auto-map similar rows that have exactly one candidate (edge fn v10).
-- Rows staged by earlier versions stay unmatched and pile up in manual review.
-- Heal them: a pending row with exactly one candidate gets that participant
-- pre-mapped (still re-configurable in review); 2+ candidates stay needs
-- review. patch.current is built from the candidate so the diff renders.

UPDATE public.sensus_sync_items i
SET matched_participant_id = p.id,
    patch = jsonb_set(
      i.patch,
      '{current}',
      jsonb_build_object(
        'id', i.patch->'candidates'->0->>'id',
        'name', i.patch->'candidates'->0->>'name',
        'birth_date', i.patch->'candidates'->0->>'birth_date',
        'kategori', i.patch->'candidates'->0->>'category',
        'khusus', coalesce((i.patch->'candidates'->0->>'is_khusus')::boolean, false)
      )
    )
FROM public.participants p
WHERE i.status = 'pending'
  AND i.matched_participant_id IS NULL
  AND jsonb_array_length(coalesce(i.patch->'candidates', '[]'::jsonb)) = 1
  AND p.id = (i.patch->'candidates'->0->>'id')::uuid;
