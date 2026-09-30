-- =============================================================================
-- Sensus sync staging and reviewed participant apply
-- =============================================================================

-- New sensus categories (skip values that already exist).
INSERT INTO public.lookup_values (type, value)
SELECT 'CATEGORY', source.value
FROM (VALUES ('Paud'), ('ACR')) AS source(value)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.lookup_values AS existing
  WHERE existing.type = 'CATEGORY'
    AND existing.value = source.value
);

-- A participant can appear in sensus while remaining outside attendance flows.
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS is_khusus boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_participants_is_khusus
  ON public.participants (is_khusus)
  WHERE is_khusus;

-- Each import attempt is retained as an append-only staging audit.
CREATE TABLE public.sensus_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('manual', 'cron')),
  triggered_by uuid REFERENCES auth.users (id),
  source_fetched_at timestamptz NOT NULL DEFAULT now(),
  row_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Source rows hold the reviewed match and the proposed patch before application.
CREATE TABLE public.sensus_sync_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.sensus_sync_runs (id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_kelompok text NOT NULL,
  source_gender text NOT NULL CHECK (source_gender IN ('L', 'P')),
  source_birth_date date,
  source_kategori text NOT NULL,
  source_khusus boolean NOT NULL DEFAULT false,
  matched_participant_id uuid REFERENCES public.participants (id),
  confidence text NOT NULL CHECK (confidence IN ('exact', 'similar', 'none')),
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'rejected')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_items_run ON public.sensus_sync_items (run_id);
CREATE INDEX IF NOT EXISTS idx_sync_items_matched_participant
  ON public.sensus_sync_items (matched_participant_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_triggered_by
  ON public.sensus_sync_runs (triggered_by);

ALTER TABLE public.sensus_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensus_sync_items ENABLE ROW LEVEL SECURITY;

-- Team managers are deliberately excluded from staging data and review actions.
CREATE POLICY sensus_sync_runs_admin ON public.sensus_sync_runs
  FOR ALL TO authenticated
  USING (public.user_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.user_role() IN ('super_admin', 'admin'));

CREATE POLICY sensus_sync_items_admin ON public.sensus_sync_items
  FOR ALL TO authenticated
  USING (public.user_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.user_role() IN ('super_admin', 'admin'));

-- The reviewed per-item apply path writes participants without widening browser
-- participant-table permissions. Individual failures are retained on their item.
CREATE FUNCTION public.apply_sensus_sync_items(p_item_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.user_role();
  v_id uuid;
  v_item public.sensus_sync_items%ROWTYPE;
  v_category_id uuid;
  v_group_id uuid;
  v_ok integer := 0;
  v_fail integer := 0;
BEGIN
  IF v_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOREACH v_id IN ARRAY p_item_ids LOOP
    BEGIN
      SELECT *
      INTO v_item
      FROM public.sensus_sync_items
      WHERE id = v_id
        AND status = 'pending'
      FOR UPDATE;

      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      SELECT id
      INTO v_category_id
      FROM public.lookup_values
      WHERE type = 'CATEGORY'
        AND value = v_item.source_kategori;

      IF v_category_id IS NULL THEN
        RAISE EXCEPTION 'Unknown category: %', v_item.source_kategori;
      END IF;

      IF v_item.matched_participant_id IS NULL THEN
        SELECT id
        INTO v_group_id
        FROM public.lookup_values
        WHERE type = 'GROUP'
          AND value = v_item.source_kelompok;

        IF v_group_id IS NULL THEN
          RAISE EXCEPTION 'Unknown kelompok: %', v_item.source_kelompok;
        END IF;

        INSERT INTO public.participants (
          name,
          gender,
          group_id,
          category_id,
          status_active,
          birth_date,
          is_khusus
        ) VALUES (
          v_item.source_name,
          v_item.source_gender,
          v_group_id,
          v_category_id,
          true,
          v_item.source_birth_date,
          v_item.source_khusus
        );
      ELSE
        UPDATE public.participants
        SET birth_date = COALESCE(birth_date, v_item.source_birth_date),
            category_id = v_category_id,
            is_khusus = v_item.source_khusus
        WHERE id = v_item.matched_participant_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Matched participant no longer exists: %', v_item.matched_participant_id;
        END IF;
      END IF;

      UPDATE public.sensus_sync_items
      SET status = 'applied',
          error = NULL
      WHERE id = v_id;

      v_ok := v_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.sensus_sync_items
      SET status = 'pending',
          error = SQLERRM
      WHERE id = v_id;

      v_fail := v_fail + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('applied', v_ok, 'failed', v_fail);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_sensus_sync_items(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_sensus_sync_items(uuid[]) TO authenticated;
