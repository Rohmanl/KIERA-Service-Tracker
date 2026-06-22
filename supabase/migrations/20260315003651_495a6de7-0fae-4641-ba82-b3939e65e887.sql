
-- Update the trigger function to handle INSERT (where OLD is null)
-- and allow SECURITY DEFINER function context
CREATE OR REPLACE FUNCTION public.update_total_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  -- For INSERT: OLD is null, so just update total if status is approved
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
      SET total_hours = COALESCE((
        SELECT SUM(hours)
        FROM public.volunteer_hours
        WHERE user_id = NEW.user_id AND status = 'approved'
      ), 0),
      updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  -- For UPDATE: only recalculate if status changed
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status = 'approved' OR OLD.status = 'approved' THEN
      IF NOT (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') OR 
              EXISTS (SELECT 1 FROM public.organizations WHERE user_id = auth.uid())) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins or organizations can change approval status';
      END IF;
    END IF;

    UPDATE public.profiles
    SET total_hours = COALESCE((
      SELECT SUM(hours)
      FROM public.volunteer_hours
      WHERE user_id = NEW.user_id AND status = 'approved'
    ), 0),
    updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;
