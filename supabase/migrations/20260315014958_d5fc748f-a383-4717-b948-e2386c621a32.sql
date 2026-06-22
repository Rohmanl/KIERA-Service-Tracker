
CREATE OR REPLACE FUNCTION public.reject_event_hours(_event_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org RECORD;
BEGIN
  SELECT id INTO v_org
  FROM public.organizations
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND organization_id = v_org.id
  ) THEN
    RAISE EXCEPTION 'Event not found or not owned by this organization';
  END IF;

  UPDATE public.event_signups
  SET verification_status = 'rejected', claimed_hours = NULL
  WHERE event_id = _event_id AND user_id = _user_id AND verification_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending claim found for this user';
  END IF;
END;
$$;
