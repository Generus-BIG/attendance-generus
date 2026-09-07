CREATE OR REPLACE FUNCTION public.lupg_get_monthly_audit_dashboard(p_month date)
RETURNS TABLE (
  kelompok_id uuid,
  kelompok_name text,
  report_id uuid,
  status text,
  last_edited_at timestamptz,
  last_editor_display_name text,
  submitted_at timestamptz,
  submitted_by_label text,
  history jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.user_role() NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Not authorized to view all kelompok audit history';
  END IF;

  -- ponytail: 500 edits per report keeps one-month audit payload bounded; add paged history only if a report reaches this ceiling.
  IF EXISTS (
    SELECT 1
    FROM public.lupg_monthly_report_edit_history h
    JOIN public.lupg_monthly_reports r ON r.id = h.monthly_report_id
    WHERE r.month = p_month
      AND public.lupg_mr_readable(r.id)
    GROUP BY h.monthly_report_id
    HAVING count(*) > 500
  ) THEN
    RAISE EXCEPTION 'Audit history exceeds the 500-entry per-report dashboard ceiling';
  END IF;

  RETURN QUERY
  SELECT
    k.id,
    k.value,
    r.id,
    r.status,
    r.last_edited_at,
    COALESCE(last_editor.raw_user_meta_data ->> 'full_name', last_editor.email),
    r.submitted_at,
    r.submitted_by_label,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', h.id,
            'edited_at', h.edited_at,
            'source_table', h.source_table,
            'action', h.action,
            'editor_display_name', COALESCE(editor.raw_user_meta_data ->> 'full_name', editor.email)
          )
          ORDER BY h.edited_at DESC, h.id DESC
        )
        FROM public.lupg_monthly_report_edit_history h
        LEFT JOIN auth.users editor ON editor.id = h.edited_by
        WHERE h.monthly_report_id = r.id
      ),
      '[]'::jsonb
    )
  FROM public.lookup_values k
  LEFT JOIN public.lupg_monthly_reports r
    ON r.kelompok_id = k.id
    AND r.month = p_month
    AND public.lupg_mr_readable(r.id)
  LEFT JOIN auth.users last_editor ON last_editor.id = r.last_edited_by
  WHERE k.type = 'GROUP'
  ORDER BY k.value;
END;
$$;

REVOKE ALL ON FUNCTION public.lupg_get_monthly_audit_dashboard(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lupg_get_monthly_audit_dashboard(date) TO authenticated;
