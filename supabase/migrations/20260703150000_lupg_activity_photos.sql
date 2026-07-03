-- ============================================================
-- Table: lupg_activity_photos
-- Stores metadata for uploaded activity documentation photos.
-- Actual files live in the 'lupg-activity-photos' Storage bucket.
-- ============================================================

CREATE TABLE lupg_activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES lupg_monthly_reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  file_size INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lupg_activity_photos_report_id
  ON lupg_activity_photos (report_id);

-- Max 6 photos per report (enforced at DB level)
CREATE OR REPLACE FUNCTION lupg_check_max_photos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT count(*) FROM lupg_activity_photos WHERE report_id = NEW.report_id) >= 6 THEN
    RAISE EXCEPTION 'Maximum 6 photos per report';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_lupg_activity_photos_max_check
  BEFORE INSERT ON lupg_activity_photos
  FOR EACH ROW
  EXECUTE FUNCTION lupg_check_max_photos();

-- RLS
ALTER TABLE lupg_activity_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY lupg_activity_photos_select ON lupg_activity_photos
  FOR SELECT USING (lupg_mr_readable(report_id));

CREATE POLICY lupg_activity_photos_insert ON lupg_activity_photos
  FOR INSERT WITH CHECK (lupg_mr_writable(report_id));

CREATE POLICY lupg_activity_photos_update ON lupg_activity_photos
  FOR UPDATE USING (lupg_mr_writable(report_id));

CREATE POLICY lupg_activity_photos_delete ON lupg_activity_photos
  FOR DELETE USING (lupg_mr_writable(report_id));

-- ============================================================
-- Storage bucket: lupg-activity-photos (private)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lupg-activity-photos',
  'lupg-activity-photos',
  false,
  2097152,  -- 2 MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
);

-- Storage policies (on storage.objects)
CREATE POLICY "lupg activity photos readable"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lupg-activity-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "lupg activity photos insertable"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lupg-activity-photos'
    AND user_role() IN ('super_admin', 'admin', 'team_manager')
  );

CREATE POLICY "lupg activity photos updatable"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'lupg-activity-photos'
    AND user_role() IN ('super_admin', 'admin', 'team_manager')
  )
  WITH CHECK (
    bucket_id = 'lupg-activity-photos'
    AND user_role() IN ('super_admin', 'admin', 'team_manager')
  );

CREATE POLICY "lupg activity photos deletable"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lupg-activity-photos'
    AND user_role() IN ('super_admin', 'admin', 'team_manager')
  );
