CREATE OR REPLACE FUNCTION public.admin_seed_fake_students(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      floor(GREATEST(4, LEAST(120, COALESCE((r->>'total_hours')::numeric, 4))))::numeric AS total_hours,
      COALESCE((r->>'show_in_ranking')::boolean, true) AS show_in_ranking,
      COALESCE((r->>'yearly_goal')::numeric, 150) AS yearly_goal
    FROM jsonb_array_elements(_rows) AS r
  ), upserted_profiles AS (
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
    RETURNING id, total_hours
  ), cleared_old_demo_hours AS (
    DELETE FROM public.volunteer_hours vh
    USING upserted_profiles up
    WHERE vh.user_id = up.id
      AND vh.verified_by_org = 'Demo Seed'
    RETURNING vh.id
  ), hour_chunks AS (
    SELECT
      up.id AS user_id,
      gs.part_number,
      CASE
        WHEN gs.part_number < CEIL(up.total_hours / 24.0)::int THEN 24::numeric
        ELSE up.total_hours - (24::numeric * (gs.part_number - 1))
      END AS hours
    FROM upserted_profiles up
    CROSS JOIN LATERAL generate_series(1, CEIL(up.total_hours / 24.0)::int) AS gs(part_number)
  ), inserted_hours AS (
    INSERT INTO public.volunteer_hours (
      user_id,
      organization,
      hours,
      date,
      location,
      description,
      status,
      source,
      verified_by_org
    )
    SELECT
      user_id,
      'Fairmont Service Demo',
      hours,
      (current_date - ((7 + floor(random() * 240))::int))::date,
      'Fairmont Campus',
      'Demo service entry ' || part_number,
      'approved'::public.hour_status,
      'external',
      'Demo Seed'
    FROM hour_chunks
    WHERE hours > 0
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upserted_profiles;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_seed_fake_students(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_seed_fake_students(jsonb) TO authenticated;