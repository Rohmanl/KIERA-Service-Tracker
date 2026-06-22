CREATE POLICY "Organizations can view attendance for their events"
ON public.volunteer_hours
FOR SELECT
TO authenticated
USING (
  source = 'platform'
  AND EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE o.user_id = auth.uid()
      AND e.title = volunteer_hours.organization
      AND e.event_date = volunteer_hours.date
  )
);