
DROP FUNCTION IF EXISTS public.get_leaderboard_profiles();

CREATE FUNCTION public.get_leaderboard_profiles()
 RETURNS TABLE(id uuid, name text, school text, grade text, city text, total_hours numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.id, p.name, p.school, p.grade, p.city, p.total_hours
  FROM public.profiles p
  WHERE p.show_in_ranking = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'admin'
    )
  ORDER BY p.total_hours DESC;
$$;
