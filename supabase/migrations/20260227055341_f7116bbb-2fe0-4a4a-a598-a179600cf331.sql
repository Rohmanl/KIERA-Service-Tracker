
-- Fix 1: Users can update their pending hours - add WITH CHECK to prevent status escalation
DROP POLICY "Users can update their pending hours" ON public.volunteer_hours;

CREATE POLICY "Users can update their pending hours"
  ON public.volunteer_hours FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND admin_notes IS NULL);

-- Fix 2: Users can submit their own hours - add WITH CHECK to prevent setting admin fields
DROP POLICY "Users can submit their own hours" ON public.volunteer_hours;

CREATE POLICY "Users can submit their own hours"
  ON public.volunteer_hours FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    status = 'pending' AND
    admin_notes IS NULL AND
    reviewed_by IS NULL AND
    reviewed_at IS NULL
  );
