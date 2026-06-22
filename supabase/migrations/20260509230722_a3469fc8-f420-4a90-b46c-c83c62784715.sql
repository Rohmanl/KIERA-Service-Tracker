
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'special';
CREATE UNIQUE INDEX IF NOT EXISTS achievements_code_key ON public.achievements(code);

-- Categorize existing
UPDATE public.achievements SET category = 'hours' WHERE rule_type = 'total_hours';
UPDATE public.achievements SET category = 'activities' WHERE rule_type = 'distinct_activities';
UPDATE public.achievements SET category = 'consistency' WHERE rule_type IN ('streak_weeks');
UPDATE public.achievements SET category = 'special' WHERE rule_type = 'weekends_count';
UPDATE public.achievements SET category = 'submissions' WHERE rule_type = 'submission_count';
UPDATE public.achievements SET category = 'activities' WHERE rule_type = 'single_activity_hours';

-- Migrate Goal Crusher to percentage rule
UPDATE public.achievements
  SET rule_type = 'goal_percent', target = 100, category = 'goals',
      description = 'Complete 100% of your service hour goal'
  WHERE code = 'GOAL_CRUSHER';

-- Fix Chosen Volunteer target (was 1000)
UPDATE public.achievements
  SET target = 50, category = 'activities',
      description = 'Log 50 hours in one activity'
  WHERE code = 'CHOSEN_VOLUNTEER';

-- Insert new achievements
INSERT INTO public.achievements (code, title, description, rule_type, target, is_active, category) VALUES
  -- Hours
  ('HOURS_5',   '5 Hour Starter',         'Reach 5 total approved hours',   'total_hours', 5,   true, 'hours'),
  ('HOURS_25',  '25 Hour Helper',         'Reach 25 total approved hours',  'total_hours', 25,  true, 'hours'),
  ('HOURS_75',  '75 Hour Achiever',       'Reach 75 total approved hours',  'total_hours', 75,  true, 'hours'),
  ('HOURS_200', '200 Hour Impact Maker',  'Reach 200 total approved hours', 'total_hours', 200, true, 'hours'),
  ('HOURS_500', '500 Hour Service Star',  'Reach 500 total approved hours', 'total_hours', 500, true, 'hours'),
  -- Activities
  ('EXPLORER',             'Explorer',             'Complete 3 different volunteer activities',  'distinct_activities', 3,  true, 'activities'),
  ('COMMUNITY_CONNECTOR',  'Community Connector',  'Complete 10 different volunteer activities', 'distinct_activities', 10, true, 'activities'),
  ('ALL_ROUND_VOLUNTEER',  'All-Round Volunteer',  'Complete 15 different volunteer activities', 'distinct_activities', 15, true, 'activities'),
  ('FOCUSED_HELPER',       'Focused Helper',       'Log 10 hours in one activity',  'single_activity_hours', 10,  true, 'activities'),
  ('DEDICATED_VOLUNTEER',  'Dedicated Volunteer',  'Log 25 hours in one activity',  'single_activity_hours', 25,  true, 'activities'),
  ('ACTIVITY_SPECIALIST',  'Activity Specialist',  'Log 100 hours in one activity', 'single_activity_hours', 100, true, 'activities'),
  -- Consistency
  ('MONTHLY_VOLUNTEER',  'Monthly Volunteer',   'Log at least one approved hour in a month', 'months_logged',  1, true, 'consistency'),
  ('THREE_MONTH_STREAK', 'Three-Month Streak',  'Log hours for 3 months in a row',           'monthly_streak', 3, true, 'consistency'),
  ('SEMESTER_STREAK',    'Semester Streak',     'Log hours every month during one semester', 'monthly_streak', 5, true, 'consistency'),
  -- Special
  ('EARLY_BIRD',     'Early Bird',     'Submit service hours before 9 AM',                    'early_bird',     1, true, 'special'),
  ('NIGHT_OWL',      'Night Owl',      'Submit service hours after 8 PM',                     'night_owl',      1, true, 'special'),
  ('HOLIDAY_HELPER', 'Holiday Helper', 'Log approved hours during a school break or holiday', 'holiday_helper', 1, true, 'special'),
  -- Submissions
  ('FIRST_SUBMISSION',  'First Submission',  'Submit your first service hour entry', 'submission_count', 1,  true, 'submissions'),
  ('FREQUENT_LOGGER',   'Frequent Logger',   'Submit 10 service hour entries',       'submission_count', 10, true, 'submissions'),
  ('RECORD_KEEPER',     'Record Keeper',     'Submit 25 service hour entries',       'submission_count', 25, true, 'submissions'),
  ('SUPER_SUBMITTER',   'Super Submitter',   'Submit 50 service hour entries',       'submission_count', 50, true, 'submissions'),
  -- Goals
  ('GOAL_STARTER',  'Goal Starter',  'Complete 25% of your service hour goal',  'goal_percent', 25,  true, 'goals'),
  ('HALFWAY_THERE', 'Halfway There', 'Complete 50% of your service hour goal',  'goal_percent', 50,  true, 'goals'),
  ('ALMOST_THERE',  'Almost There',  'Complete 75% of your service hour goal',  'goal_percent', 75,  true, 'goals'),
  ('OVERACHIEVER',  'Overachiever',  'Exceed your service hour goal',           'goal_percent', 110, true, 'goals'),
  -- Special / Leadership keyword-based
  ('MENTOR_BADGE',    'Mentor Badge',    'Help with an activity that involves tutoring, mentoring, or teaching', 'keyword_mentor', 1, true, 'special'),
  ('EVENT_SUPPORTER', 'Event Supporter', 'Volunteer for an event-based activity',                                'keyword_event',  1, true, 'special'),
  ('CAMPUS_HELPER',   'Campus Helper',   'Complete service related to school or campus support',                 'keyword_campus', 1, true, 'special'),
  ('LOCAL_IMPACT',    'Local Impact',    'Complete service for a community organization',                        'keyword_local',  1, true, 'special')
ON CONFLICT (code) DO NOTHING;
