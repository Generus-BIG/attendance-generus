DROP FUNCTION IF EXISTS public.lupg_get_monthly_report_edit_history(uuid);

CREATE OR REPLACE FUNCTION public.lupg_get_monthly_report_edit_history(
  p_report_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  monthly_report_id uuid,
  kelompok_id uuid,
  edited_at timestamptz,
  edited_by uuid,
  source_table text,
  action text,
  editor_display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT h.id, h.monthly_report_id, h.kelompok_id, h.edited_at,
         h.edited_by, h.source_table, h.action,
         COALESCE(u.raw_user_meta_data ->> 'full_name', u.email) AS editor_display_name
  FROM public.lupg_monthly_report_edit_history h
  LEFT JOIN auth.users u ON u.id = h.edited_by
  WHERE h.monthly_report_id = p_report_id
    AND public.lupg_mr_readable(h.monthly_report_id)
  ORDER BY h.edited_at DESC, h.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.lupg_get_monthly_report_edit_history(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_get_monthly_report_edit_history(uuid, integer) TO authenticated;
