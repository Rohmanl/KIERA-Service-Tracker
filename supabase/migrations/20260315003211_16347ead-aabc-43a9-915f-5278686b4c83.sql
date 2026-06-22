
-- Drop the old policy that may have issues with volunteer_hours.user_id reference
DROP POLICY IF EXISTS "Organizations can insert hours for event attendees" ON public.volunteer_hours;

-- Recreate with a simpler approach using NEW row reference implicitly
CREATE POLICY "Organizations can insert hours for event attendees"
  ON public.volunteer_hours FOR INSERT TO authenticated
  WITH CHECK (
    source = 'platform'
    AND status = 'approved'
    AND auth.uid() != user_id
    AND EXISTS (
      SELECT 1 FROM public.event_signups es
      JOIN public.events e ON e.id = es.event_id
      JOIN public.organizations o ON o.id = e.organization_id
      WHERE es.user_id = volunteer_hours.user_id
        AND o.user_id = auth.uid()
    )
  );
