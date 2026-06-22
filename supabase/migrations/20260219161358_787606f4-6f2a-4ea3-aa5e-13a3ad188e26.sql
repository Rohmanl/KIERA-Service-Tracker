
-- Create achievements definitions table
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  rule_type text NOT NULL,
  target numeric NOT NULL,
  is_active boolean DEFAULT true
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view achievements"
ON public.achievements FOR SELECT
TO authenticated
USING (true);

-- Create user_achievements join table
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
ON public.user_achievements FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Seed achievement definitions
INSERT INTO public.achievements (code, title, description, rule_type, target) VALUES
  ('FIRST_STEPS', 'First Steps', 'Log your first volunteer hour', 'total_hours', 1),
  ('10_HOUR_HERO', '10 Hour Hero', 'Reach 10 total approved hours', 'total_hours', 10),
  ('TEAM_PLAYER', 'Team Player', 'Complete 5 volunteer activities', 'distinct_activities', 5),
  ('WEEKEND_WARRIOR', 'Weekend Warrior', 'Log hours on 5 different weekends', 'weekends_count', 5),
  ('50_HOUR_CHAMPION', '50 Hour Champion', 'Reach 50 total approved hours', 'total_hours', 50),
  ('CONSISTENCY_KING', 'Consistency King', 'Log hours 4 weeks in a row', 'streak_weeks', 4),
  ('100_HOUR_LEGEND', '100 Hour Legend', 'Reach 100 total approved hours', 'total_hours', 100),
  ('COMMUNITY_LEADER', 'Community Leader', 'Reach 150 total approved hours', 'total_hours', 150),
  ('GOAL_CRUSHER', 'Goal Crusher', 'Complete your 150 hour goal', 'goal_complete', 150),
  ('CHOSEN_VOLUNTEER', 'Chosen Volunteer', 'Log 1000 hours on a single activity', 'single_activity_hours', 1000);
