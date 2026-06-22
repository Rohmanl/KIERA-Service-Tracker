
CREATE OR REPLACE FUNCTION public.validate_user_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  def RECORD;
  v_total_hours numeric;
  v_distinct_orgs integer;
  v_weekend_count integer;
  v_submission_count integer;
  v_max_single_activity numeric;
  v_current numeric;
BEGIN
  -- Fetch the achievement definition
  SELECT rule_type, target, is_active INTO def
  FROM public.achievements
  WHERE id = NEW.achievement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found';
  END IF;

  IF def.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Achievement is not active';
  END IF;

  -- Compute stats from approved volunteer_hours for this user
  SELECT
    COALESCE(SUM(hours), 0),
    COUNT(DISTINCT organization),
    COUNT(DISTINCT CASE WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN date END),
    COUNT(*)
  INTO v_total_hours, v_distinct_orgs, v_weekend_count, v_submission_count
  FROM public.volunteer_hours
  WHERE user_id = NEW.user_id AND status = 'approved';

  -- Max hours for a single organization
  SELECT COALESCE(MAX(org_hours), 0) INTO v_max_single_activity
  FROM (
    SELECT SUM(hours) AS org_hours
    FROM public.volunteer_hours
    WHERE user_id = NEW.user_id AND status = 'approved'
    GROUP BY organization
  ) sub;

  -- Determine current value based on rule_type
  CASE def.rule_type
    WHEN 'total_hours' THEN v_current := v_total_hours;
    WHEN 'goal_complete' THEN v_current := v_total_hours;
    WHEN 'distinct_activities' THEN v_current := v_distinct_orgs;
    WHEN 'weekends_count' THEN v_current := v_weekend_count;
    WHEN 'single_activity_hours' THEN v_current := v_max_single_activity;
    WHEN 'submission_count' THEN v_current := v_submission_count;
    WHEN 'streak_weeks' THEN v_current := v_submission_count; -- simplified; client recalculates
    ELSE v_current := 0;
  END CASE;

  IF v_current < def.target THEN
    RAISE EXCEPTION 'Achievement criteria not met: need % but have %', def.target, v_current;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_achievement_before_insert
  BEFORE INSERT ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_achievement();
