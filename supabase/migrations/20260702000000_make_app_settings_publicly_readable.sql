-- Drop the existing select policy on app_settings
DROP POLICY IF EXISTS app_settings_select ON public.app_settings;

-- Create a new select policy on app_settings that allows all roles (including anon) to read
CREATE POLICY app_settings_select ON public.app_settings
  FOR SELECT TO public USING (true);
