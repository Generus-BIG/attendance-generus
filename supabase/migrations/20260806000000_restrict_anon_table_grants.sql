-- The browser publishable/anon key is intentionally public. Its database role must
-- only reach endpoints that are explicitly public; RLS remains the row boundary.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Anonymous visitors need these read-only resources for public attendance and
-- the unauthenticated app shell. All sensitive access remains through scoped RPCs.
GRANT SELECT ON TABLE public.attendance_forms, public.lookup_values, public.app_settings TO anon;

-- Do not make future settings public by default.
DROP POLICY IF EXISTS app_settings_select ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('default_palette', 'default_theme'));
