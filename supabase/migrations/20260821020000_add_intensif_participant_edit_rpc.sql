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
  birth_place text,
  status_active boolean,
  category_code text
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
  SELECT p.id, p.name, p.group_id, p.gender, p.birth_date, p.birth_place,
    p.status_active, category.value
  FROM public.participants p
  JOIN public.lookup_values category ON category.id = p.category_id
  WHERE p.status_active = true
    AND p.group_id = v_kelompok_id
    AND category.value = v_category
  ORDER BY p.name;
END;
$$;

CREATE FUNCTION public.update_lupg_intensif_participant(
  p_participant_id uuid,
  p_name text,
  p_gender text,
  p_category_code text,
  p_birth_date date,
  p_birth_place text,
  p_status_active boolean
)
RETURNS TABLE (
  id uuid,
  name text,
  kelompok_id uuid,
  gender text,
  birth_date date,
  birth_place text,
  status_active boolean,
  category_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.user_role();
  v_category_id uuid;
BEGIN
  IF v_role NOT IN ('super_admin', 'admin', 'mt') THEN
    RAISE EXCEPTION 'Tidak berwenang mengubah peserta Intensif';
  END IF;
  IF NULLIF(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama peserta wajib diisi';
  END IF;
  IF p_gender NOT IN ('L', 'P') THEN
    RAISE EXCEPTION 'Jenis kelamin tidak valid';
  END IF;
  IF p_category_code NOT IN ('GPN A', 'GPN B', 'AR', 'APR') THEN
    RAISE EXCEPTION 'Kategori tidak valid';
  END IF;
  IF p_birth_date IS NOT NULL AND (
    p_birth_date > CURRENT_DATE OR p_birth_date <= DATE '1900-01-01'
  ) THEN
    RAISE EXCEPTION 'Tanggal lahir tidak valid';
  END IF;

  SELECT id INTO v_category_id
  FROM public.lookup_values
  WHERE type = 'CATEGORY' AND value = p_category_code;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Kategori tidak ditemukan';
  END IF;

  IF v_role = 'mt' AND NOT EXISTS (
    SELECT 1 FROM public.participants
    WHERE id = p_participant_id AND group_id = public.user_kelompok_id()
  ) THEN
    RAISE EXCEPTION 'Peserta berada di luar kelompok Anda';
  END IF;

  RETURN QUERY
  UPDATE public.participants p
  SET name = btrim(p_name),
    gender = p_gender,
    category_id = v_category_id,
    birth_date = p_birth_date,
    birth_place = NULLIF(btrim(p_birth_place), ''),
    status_active = p_status_active
  WHERE p.id = p_participant_id
  RETURNING p.id, p.name, p.group_id, p.gender, p.birth_date, p.birth_place,
    p.status_active, (
      SELECT value FROM public.lookup_values WHERE id = p.category_id
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peserta tidak ditemukan';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_lupg_intensif_candidates(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_lupg_intensif_participant(uuid, text, text, text, date, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_lupg_intensif_candidates(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lupg_intensif_participant(uuid, text, text, text, date, text, boolean) TO authenticated;
