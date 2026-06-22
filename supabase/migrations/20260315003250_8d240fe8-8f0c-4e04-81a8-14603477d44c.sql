
-- Drop the problematic RLS policy
DROP POLICY IF EXISTS "Organizations can insert hours for event attendees" ON public.volunteer_hours;

-- Create a SECURITY DEFINER function for orgs to mark attendance
CREATE OR REPLACE FUNCTION public.mark_event_attendance(
  _event_id uuid,
  _user_id uuid,
  _hours numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_org RECORD;
  v_already_exists boolean;
BEGIN
  -- Verify the calling user owns an organization
  SELECT id, org_name INTO v_org
  FROM public.organizations
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an organization';
  END IF;

  -- Verify the event belongs to this organization
  SELECT title, event_date, location, organization_id INTO v_event
  FROM public.events
  WHERE id = _event_id AND organization_id = v_org.id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not owned by this organization';
  END IF;

  -- Verify the user is signed up for this event
  IF NOT EXISTS (
    SELECT 1 FROM public.event_signups
    WHERE event_id = _event_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'User is not signed up for this event';
  END IF;

  -- Check for duplicate attendance
  SELECT EXISTS (
    SELECT 1 FROM public.volunteer_hours
    WHERE user_id = _user_id
      AND organization = v_event.title
      AND source = 'platform'
      AND date = v_event.event_date
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RAISE EXCEPTION 'Attendance already recorded for this user';
  END IF;

  -- Validate hours
  IF _hours <= 0 OR _hours > 24 THEN
    RAISE EXCEPTION 'Hours must be between 0.5 and 24';
  END IF;

  -- Insert the approved hour record
  INSERT INTO public.volunteer_hours (user_id, organization, hours, date, location, description, status, source, verified_by_org)
  VALUES (
    _user_id,
    v_event.title,
    _hours,
    v_event.event_date,
    v_event.location,
    'Attended event: ' || v_event.title,
    'approved',
    'platform',
    v_org.org_name
  );

  -- Update the user's total_hours
  UPDATE public.profiles
  SET total_hours = COALESCE((
    SELECT SUM(hours) FROM public.volunteer_hours
    WHERE user_id = _user_id AND status = 'approved'
  ), 0),
  updated_at = NOW()
  WHERE id = _user_id;
END;
$$;
