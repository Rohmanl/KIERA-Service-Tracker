
-- Allow all authenticated users to view organization names
CREATE POLICY "All authenticated can view organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);
