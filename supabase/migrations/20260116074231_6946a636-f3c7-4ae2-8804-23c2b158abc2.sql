-- Create a function to get leaderboard profiles excluding admins
CREATE OR REPLACE FUNCTION public.get_leaderboard_profiles()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  school text,
  grade text,
  city text,
  total_hours numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.email, p.school, p.grade, p.city, p.total_hours
  FROM public.profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  )
  ORDER BY p.total_hours DESC;
$$;