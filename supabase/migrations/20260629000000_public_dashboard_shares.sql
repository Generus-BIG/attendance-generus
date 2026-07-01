-- =============================================================================
-- Public Dashboard Sharing: table, RLS, indexes, and RPC
-- =============================================================================
-- Source-of-truth migration for the public dashboard sharing feature.
-- Captures: public_dashboard_shares table (incl. display_mode), constraints,
-- indexes, RLS policies, grants, and the get_public_dashboard_payload RPC.
--
-- Privacy note: get_public_dashboard_payload returns md5 surrogate keys for
-- participant_id, attendance id, and census participant id when the followUp
-- section is disabled, so raw DB identifiers are never exposed on public links.
-- When followUp is enabled, real ids are returned (needed for the follow-up table).
-- The md5 mapping is deterministic, preserving client-side aggregation logic.

-- =============================================================================
-- 1. Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.public_dashboard_shares (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  token       text        NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  is_active   boolean     NOT NULL DEFAULT true,
  scope       text        NOT NULL DEFAULT 'desa',
  display_mode text       NOT NULL DEFAULT 'monthly',
  form_mode   text        NOT NULL DEFAULT 'all',
  form_ids    uuid[]      NOT NULL DEFAULT ARRAY[]::uuid[],
  visible_sections jsonb  NOT NULL DEFAULT jsonb_build_object(
                            'statCards', true,
                            'groupChart', true,
                            'calendar', true,
                            'categoryChart', true,
                            'genderChart', true,
                            'attendanceDistribution', true,
                            'followUp', false
                          ),
  created_by  uuid        DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT public_dashboard_shares_display_mode_check
    CHECK (display_mode = ANY (ARRAY['monthly', 'forms'])),
  CONSTRAINT public_dashboard_shares_form_mode_check
    CHECK (form_mode = ANY (ARRAY['all', 'selected'])),
  CONSTRAINT public_dashboard_shares_scope_check
    CHECK (scope = 'desa'),
  CONSTRAINT public_dashboard_shares_selected_forms_check
    CHECK (form_mode = 'all' OR cardinality(form_ids) > 0),
  CONSTRAINT public_dashboard_shares_forms_display_requires_selected_check
    CHECK (display_mode <> 'forms' OR (form_mode = 'selected' AND cardinality(form_ids) > 0))
);

-- Unique constraint on token (separate from PK)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'public_dashboard_shares_token_key'
  ) THEN
    ALTER TABLE public.public_dashboard_shares ADD CONSTRAINT public_dashboard_shares_token_key UNIQUE (token);
  END IF;
END $$;

-- =============================================================================
-- 2. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_public_dashboard_shares_active_token
  ON public.public_dashboard_shares (token)
  WHERE is_active = true;

-- =============================================================================
-- 3. Row Level Security
-- =============================================================================
ALTER TABLE public.public_dashboard_shares ENABLE ROW LEVEL SECURITY;

-- Admin-only CRUD (super_admin + admin via JWT app_metadata role helper)
DROP POLICY IF EXISTS public_dashboard_shares_admin_select ON public.public_dashboard_shares;
DROP POLICY IF EXISTS public_dashboard_shares_admin_insert ON public.public_dashboard_shares;
DROP POLICY IF EXISTS public_dashboard_shares_admin_update ON public.public_dashboard_shares;
DROP POLICY IF EXISTS public_dashboard_shares_admin_delete ON public.public_dashboard_shares;

CREATE POLICY public_dashboard_shares_admin_select ON public.public_dashboard_shares
  FOR SELECT TO authenticated
  USING (user_role() = ANY (ARRAY['super_admin', 'admin']));

CREATE POLICY public_dashboard_shares_admin_insert ON public.public_dashboard_shares
  FOR INSERT TO authenticated
  WITH CHECK (user_role() = ANY (ARRAY['super_admin', 'admin']));

CREATE POLICY public_dashboard_shares_admin_update ON public.public_dashboard_shares
  FOR UPDATE TO authenticated
  USING (user_role() = ANY (ARRAY['super_admin', 'admin']))
  WITH CHECK (user_role() = ANY (ARRAY['super_admin', 'admin']));

CREATE POLICY public_dashboard_shares_admin_delete ON public.public_dashboard_shares
  FOR DELETE TO authenticated
  USING (user_role() = ANY (ARRAY['super_admin', 'admin']));

-- =============================================================================
-- 4. Grants
-- =============================================================================
GRANT ALL ON public.public_dashboard_shares TO anon, authenticated, service_role;

-- =============================================================================
-- 5. RPC: get_public_dashboard_payload
-- =============================================================================
-- Returns the public-safe dashboard payload for a given share token + month.
-- SECURITY DEFINER is required because anon (public link, no auth) must read
-- attendance/participants data that is otherwise RLS-gated.
-- When followUp section is disabled, participant/attendance/census identifiers
-- are replaced with deterministic md5 surrogate keys to prevent identifier leakage.

CREATE OR REPLACE FUNCTION public.get_public_dashboard_payload(p_token text, p_month text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  share_row public.public_dashboard_shares%rowtype;
  month_start timestamptz;
  month_end timestamptz;
  allowed_form_ids uuid[];
  follow_up_enabled boolean;
begin
  select *
  into share_row
  from public.public_dashboard_shares
  where token = p_token
    and is_active = true
    and scope = 'desa'
  limit 1;

  if share_row.id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;

  month_start := date_trunc(
    'month',
    coalesce(to_date(nullif(p_month, ''), 'YYYY-MM'), now()::date)
  );
  month_end := month_start + interval '1 month';
  follow_up_enabled := coalesce((share_row.visible_sections ->> 'followUp')::boolean, false);

  if share_row.display_mode = 'forms' then
    select coalesce(array_agg(af.id order by af.date), array[]::uuid[])
    into allowed_form_ids
    from public.attendance_forms af
    where af.form_type = 'desa'
      and af.id = any(share_row.form_ids);
  else
    select coalesce(array_agg(af.id order by af.date), array[]::uuid[])
    into allowed_form_ids
    from public.attendance_forms af
    where af.form_type = 'desa'
      and (
        share_row.form_mode = 'all'
        or af.id = any(share_row.form_ids)
      );
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'share', jsonb_build_object(
      'id', share_row.id,
      'name', share_row.name,
      'token', share_row.token,
      'visibleSections', share_row.visible_sections,
      'displayMode', share_row.display_mode,
      'formMode', share_row.form_mode,
      'formIds', share_row.form_ids
    ),
    'forms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', af.id,
        'title', af.title,
        'date', af.date
      ) order by af.date)
      from public.attendance_forms af
      where af.id = any(allowed_form_ids)
    ), '[]'::jsonb),
    'records', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', case when follow_up_enabled then a.id::text else md5(a.id::text) end,
        'form_id', a.form_id,
        'participant_id', case
          when a.participant_id is null then null
          when follow_up_enabled then a.participant_id::text
          else md5(a.participant_id::text)
        end,
        'status', a.status,
        'timestamp', a.timestamp,
        'is_pending', a.is_pending,
        'temp_name', case when follow_up_enabled then a.temp_name else null end,
        'temp_category', a.temp_category,
        'participant_name', case when follow_up_enabled then p.name else null end,
        'category_value', cat.value,
        'group_value', grp.value,
        'gender_value', coalesce(p.gender, a.temp_gender),
        'permission_reason', a.permission_reason
      ) order by a.timestamp)
      from public.attendance a
      left join public.participants p on p.id = a.participant_id
      left join public.lookup_values cat on cat.id = p.category_id
      left join public.lookup_values grp on grp.id = p.group_id
      where a.form_id = any(allowed_form_ids)
        and (
          share_row.display_mode = 'forms'
          or (a.timestamp >= month_start and a.timestamp < month_end)
        )
        and a.is_pending = false
    ), '[]'::jsonb),
    'censusParticipants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', case when follow_up_enabled then p.id::text else md5(p.id::text) end,
        'name', case when follow_up_enabled then p.name else null end,
        'group', grp.value,
        'category', cat.value,
        'gender', p.gender
      ) order by grp.value, p.name)
      from public.participants p
      left join public.lookup_values cat on cat.id = p.category_id
      left join public.lookup_values grp on grp.id = p.group_id
      where p.status_active = true
        and cat.value in ('GPN A', 'GPN B', 'AR', 'APR')
    ), '[]'::jsonb)
  );
end;
$function$;

-- Grant execute to anon (public links) and authenticated (admin preview)
GRANT EXECUTE ON FUNCTION public.get_public_dashboard_payload(text, text) TO anon, authenticated;
