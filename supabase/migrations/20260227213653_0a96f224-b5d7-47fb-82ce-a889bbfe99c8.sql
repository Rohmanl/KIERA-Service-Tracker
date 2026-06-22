
CREATE OR REPLACE FUNCTION public.get_leaderboard_profiles_since(since_date date DEFAULT NULL)
 RETURNS TABLE(id uuid, name text, school text, grade text, city text, total_hours numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    p.id, 
    p.name, 
    p.school, 
    p.grade, 
    p.city,
    COALESCE(SUM(vh.hours), 0) AS total_hours
  FROM public.profiles p
  LEFT JOIN public.volunteer_hours vh 
    ON vh.user_id = p.id 
    AND vh.status = 'approved'
    AND (since_date IS NULL OR vh.date >= since_date)
  WHERE p.show_in_ranking = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'admin'
    )
  GROUP BY p.id, p.name, p.school, p.grade, p.city
  HAVING COALESCE(SUM(vh.hours), 0) > 0
  ORDER BY total_hours DESC;
$$;
