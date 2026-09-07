ALTER TABLE public.lupg_monthly_report_edit_history
  DROP CONSTRAINT IF EXISTS lupg_monthly_report_edit_history_action_check,
  ADD CONSTRAINT lupg_monthly_report_edit_history_action_check
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SUBMIT', 'REOPEN'));

CREATE OR REPLACE FUNCTION public.fn_lupg_log_monthly_report_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN
    PERFORM public.fn_lupg_record_monthly_report_edit(NEW.id, 'report', 'SUBMIT');
  ELSIF OLD.status = 'submitted' AND NEW.status = 'draft' THEN
    PERFORM public.fn_lupg_record_monthly_report_edit(NEW.id, 'report', 'REOPEN');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_lupg_log_monthly_report_lifecycle()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER lupg_monthly_reports_history
AFTER UPDATE OF status ON public.lupg_monthly_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_lupg_log_monthly_report_lifecycle();

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
