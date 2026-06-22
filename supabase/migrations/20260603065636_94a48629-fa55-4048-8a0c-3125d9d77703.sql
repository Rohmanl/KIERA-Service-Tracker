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
  ), seeded_hour_parts AS (
    SELECT
      up.id AS user_id,
      part.part_number,
      CASE
        WHEN part.part_number = 1 THEN floor(up.total_hours * (0.35 + random() * 0.3))::numeric
        ELSE up.total_hours - floor(up.total_hours * (0.35 + random() * 0.3))::numeric
      END AS hours
    FROM upserted_profiles up
    CROSS JOIN LATERAL generate_series(1, CASE WHEN up.total_hours >= 8 AND random() < 0.7 THEN 2 ELSE 1 END) AS part(part_number)
  ), balanced_hour_parts AS (
    SELECT
      shp.user_id,
      shp.part_number,
      CASE
        WHEN max(shp.part_number) OVER (PARTITION BY shp.user_id) = 1 THEN p.total_hours
        WHEN shp.part_number = 1 THEN GREATEST(1, LEAST(p.total_hours - 1, shp.hours))
        ELSE p.total_hours - GREATEST(1, LEAST(p.total_hours - 1, first_value(shp.hours) OVER (PARTITION BY shp.user_id ORDER BY shp.part_number)))
      END AS hours
    FROM seeded_hour_parts shp
    JOIN upserted_profiles p ON p.id = shp.user_id
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
      CASE WHEN part_number = 1 THEN 'Demo volunteer service shift' ELSE 'Demo community outreach shift' END,
      'approved'::public.hour_status,
      'external',
      'Demo Seed'
    FROM balanced_hour_parts
    WHERE hours > 0
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upserted_profiles;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_seed_fake_students(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_seed_fake_students(jsonb) TO authenticated;