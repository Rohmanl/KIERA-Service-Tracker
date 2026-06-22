
DROP POLICY IF EXISTS "Users can submit their own hours" ON public.volunteer_hours;
CREATE POLICY "Users can submit their own hours"
ON public.volunteer_hours
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
  AND (status IN ('pending'::hour_status, 'pending_external_org'::hour_status))
  AND (admin_notes IS NULL)
  AND (reviewed_by IS NULL)
  AND (reviewed_at IS NULL)
);

CREATE OR REPLACE FUNCTION public.get_hours_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  organization text,
  description text,
  hours numeric,
  date date,
  location text,
  status public.hour_status,
  volunteer_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vh.id, vh.organization, vh.description, vh.hours, vh.date, vh.location, vh.status, p.name
  FROM public.volunteer_hours vh
  LEFT JOIN public.profiles p ON p.id = vh.user_id
  WHERE vh.verification_token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.verify_hours_by_token(_token uuid)
RETURNS public.hour_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.hour_status;
BEGIN
  SELECT status INTO v_current
  FROM public.volunteer_hours
  WHERE verification_token = _token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid verification token';
  END IF;

  IF v_current <> 'pending_external_org'::hour_status THEN
    RETURN v_current;
  END IF;

  UPDATE public.volunteer_hours
  SET status = 'org_verified'::hour_status,
      updated_at = now()
  WHERE verification_token = _token;

  RETURN 'org_verified'::hour_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_hours_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_hours_by_token(uuid) TO anon, authenticated;
