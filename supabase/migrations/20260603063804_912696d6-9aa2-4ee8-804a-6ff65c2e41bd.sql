CREATE OR REPLACE FUNCTION public.admin_seed_fake_students(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can seed fake students';
  END IF;

  WITH inserted AS (
    INSERT INTO public.profiles (id, name, email, school, grade, total_hours, show_in_ranking, yearly_goal)
    SELECT
      (r->>'id')::uuid,
      r->>'name',
      r->>'email',
      r->>'school',
      r->>'grade',
      (r->>'total_hours')::numeric,
      COALESCE((r->>'show_in_ranking')::boolean, true),
      COALESCE((r->>'yearly_goal')::numeric, 150)
    FROM jsonb_array_elements(_rows) AS r
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_seed_fake_students(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_seed_fake_students(jsonb) TO authenticated;