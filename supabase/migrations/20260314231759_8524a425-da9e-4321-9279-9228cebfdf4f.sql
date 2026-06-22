
-- Fix existing organization accounts that have wrong role due to the previous client-side update bug
UPDATE public.user_roles 
SET role = 'organization' 
WHERE user_id IN (
  SELECT user_id FROM public.organizations
) AND role = 'volunteer';
