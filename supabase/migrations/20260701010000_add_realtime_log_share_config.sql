-- Update default value for visible_sections on public_dashboard_shares
ALTER TABLE public.public_dashboard_shares
  ALTER COLUMN visible_sections SET DEFAULT jsonb_build_object(
    'statCards', true,
    'groupChart', true,
    'calendar', true,
    'categoryChart', true,
    'genderChart', true,
    'attendanceDistribution', true,
    'followUp', false,
    'realtimeLog', false
  );

-- Update existing rows to include 'realtimeLog' if not already present
UPDATE public.public_dashboard_shares
SET visible_sections = visible_sections || '{"realtimeLog": false}'::jsonb
WHERE visible_sections ->> 'realtimeLog' IS NULL;

-- Enable Realtime for attendance table by adding it to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END;
$$;

-- Create indexes on foreign key columns of attendance table if not already present
CREATE INDEX IF NOT EXISTS idx_attendance_form_id ON public.attendance (form_id);
CREATE INDEX IF NOT EXISTS idx_attendance_participant_id ON public.attendance (participant_id);
