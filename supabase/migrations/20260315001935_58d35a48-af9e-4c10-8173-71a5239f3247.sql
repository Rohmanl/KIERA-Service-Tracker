
-- Add source tracking to volunteer_hours
ALTER TABLE public.volunteer_hours 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS verified_by_org text;

-- Allow organizations to insert volunteer hours (for marking attendance)
CREATE POLICY "Organizations can insert hours for event attendees"
  ON public.volunteer_hours FOR INSERT TO authenticated
  WITH CHECK (
    source = 'platform'
    AND status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.event_signups es
      JOIN public.events e ON e.id = es.event_id
      WHERE es.user_id = volunteer_hours.user_id
        AND e.organization_id IN (
          SELECT id FROM public.organizations WHERE user_id = auth.uid()
        )
    )
  );
