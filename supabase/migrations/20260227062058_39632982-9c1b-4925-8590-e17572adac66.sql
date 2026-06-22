
-- Drop existing hours check constraint (it only enforces > 0)
ALTER TABLE public.volunteer_hours DROP CONSTRAINT IF EXISTS volunteer_hours_hours_check;

-- Add tighter immutable constraints
ALTER TABLE public.volunteer_hours
  ADD CONSTRAINT hours_reasonable_range CHECK (hours >= 0.5 AND hours <= 24),
  ADD CONSTRAINT organization_max_length CHECK (char_length(organization) <= 100),
  ADD CONSTRAINT location_max_length CHECK (char_length(location) <= 200),
  ADD CONSTRAINT description_max_length CHECK (char_length(description) <= 500);

-- Use a validation trigger for date (CURRENT_DATE is not immutable)
CREATE OR REPLACE FUNCTION public.validate_volunteer_hours_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Date cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_volunteer_hours_date_trigger
  BEFORE INSERT OR UPDATE OF date ON public.volunteer_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_volunteer_hours_date();
