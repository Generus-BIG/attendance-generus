ALTER TABLE public.lupg_phq_progress
  ADD COLUMN juz_mastery_percent integer
  CHECK (juz_mastery_percent BETWEEN 0 AND 100);
