DROP FUNCTION public.list_lupg_intensif_candidates(text, uuid);

CREATE FUNCTION public.list_lupg_intensif_candidates(
  p_program_code text,
  p_kelompok_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  kelompok_id uuid,
  gender text,
  birth_date date,
  status_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.user_role();
  v_kelompok_id uuid;
  v_category text;
BEGIN
  IF v_role NOT IN ('super_admin', 'admin', 'mt') THEN
    RAISE EXCEPTION 'Tidak berwenang melihat kandidat Intensif';
  END IF;

  v_category := CASE p_program_code
    WHEN 'APR_INTENSIF' THEN 'APR'
    WHEN 'AR_INTENSIF' THEN 'AR'
    ELSE NULL
  END;
  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Program Intensif tidak valid';
  END IF;

  v_kelompok_id := CASE
    WHEN v_role = 'mt' THEN public.user_kelompok_id()
    ELSE p_kelompok_id
  END;
  IF v_kelompok_id IS NULL THEN
    RAISE EXCEPTION 'Kelompok wajib dipilih';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.group_id, p.gender, p.birth_date, p.status_active
  FROM public.participants p
  JOIN public.lookup_values category ON category.id = p.category_id
  WHERE p.status_active = true
    AND p.group_id = v_kelompok_id
    AND category.value = v_category
  ORDER BY p.name;
END;
$$;

REVOKE ALL ON FUNCTION public.list_lupg_intensif_candidates(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_lupg_intensif_candidates(text, uuid) TO authenticated;
