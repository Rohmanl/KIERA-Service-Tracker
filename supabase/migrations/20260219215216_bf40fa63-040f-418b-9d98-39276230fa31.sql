
-- Add show_in_ranking column (default true so existing users are visible)
ALTER TABLE public.profiles ADD COLUMN show_in_ranking boolean NOT NULL DEFAULT true;

-- Update the leaderboard function to exclude users who opted out
CREATE OR REPLACE FUNCTION public.get_leaderboard_profiles()
 RETURNS TABLE(id uuid, name text, email text, school text, grade text, city text, total_hours numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.name, p.email, p.school, p.grade, p.city, p.total_hours
  FROM public.profiles p
  WHERE p.show_in_ranking = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'admin'
    )
  ORDER BY p.total_hours DESC;
$function$;
