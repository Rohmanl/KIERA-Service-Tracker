
-- Add organization_id to volunteer_hours (nullable, for linking to registered orgs)
ALTER TABLE public.volunteer_hours 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- RLS: Organizations can view hours submitted to them
CREATE POLICY "Organizations can view hours submitted to them"
ON public.volunteer_hours
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = volunteer_hours.organization_id 
    AND user_id = auth.uid()
  )
);

-- RLS: Organizations can update status of hours submitted to them
CREATE POLICY "Organizations can update hours submitted to them"
ON public.volunteer_hours
FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = volunteer_hours.organization_id 
    AND user_id = auth.uid()
  )
);
