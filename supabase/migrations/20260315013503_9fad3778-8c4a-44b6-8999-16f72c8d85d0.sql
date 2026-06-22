
ALTER TABLE public.event_signups
  ADD COLUMN claimed_hours numeric DEFAULT NULL,
  ADD COLUMN verification_status text NOT NULL DEFAULT 'none';

-- Allow students to update their own signups (to submit claimed hours)
CREATE POLICY "Users can update own signup"
ON public.event_signups
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
