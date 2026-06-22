ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

CREATE OR REPLACE FUNCTION public.admin_seed_fake_students(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can seed fake students';
  END IF;

  WITH normalized_rows AS (
    SELECT
      COALESCE((r->>'id')::uuid, gen_random_uuid()) AS id,
      NULLIF(trim(r->>'name'), '') AS name,
      NULLIF(lower(trim(r->>'email')), '') AS email,
      COALESCE(NULLIF(trim(r->>'school'), ''), 'Fairmont') AS school,
      COALESCE(NULLIF(trim(r->>'grade'), ''), '9') AS grade,
      GREATEST(4, LEAST(120, COALESCE((r->>'total_hours')::numeric, 4))) AS total_hours,
      COALESCE((r->>'show_in_ranking')::boolean, true) AS show_in_ranking,
      COALESCE((r->>'yearly_goal')::numeric, 150) AS yearly_goal
    FROM jsonb_array_elements(_rows) AS r
  ), inserted AS (
    INSERT INTO public.profiles (
      id,
      name,
      email,
      school,
      grade,
      total_hours,
      show_in_ranking,
      yearly_goal
    )
    SELECT
      id,
      name,
      email,
      school,
      grade,
      total_hours,
      show_in_ranking,
      yearly_goal
    FROM normalized_rows
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      school = EXCLUDED.school,
      grade = EXCLUDED.grade,
      total_hours = EXCLUDED.total_hours,
      show_in_ranking = EXCLUDED.show_in_ranking,
      yearly_goal = EXCLUDED.yearly_goal,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_seed_fake_students(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_seed_fake_students(jsonb) TO authenticated;