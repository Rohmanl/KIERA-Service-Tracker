
CREATE POLICY "Organizations can view profiles of their event registrants"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT es.user_id FROM public.event_signups es
      JOIN public.events e ON e.id = es.event_id
      JOIN public.organizations o ON o.id = e.organization_id
      WHERE o.user_id = auth.uid()
    )
  );
