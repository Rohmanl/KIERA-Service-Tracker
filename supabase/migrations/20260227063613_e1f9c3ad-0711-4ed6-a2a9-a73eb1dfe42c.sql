
-- Harden the update_total_hours trigger with explicit admin check
CREATE OR REPLACE FUNCTION public.update_total_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When status changes to approved, add hours
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Defense-in-depth: verify caller is admin or system (NULL uid = internal/system call)
    IF NOT (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can approve hours';
    END IF;

    UPDATE public.profiles
    SET total_hours = total_hours + NEW.hours,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  -- When status changes from approved to something else, subtract hours
  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    IF NOT (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')) THEN
      RAISE EXCEPTION 'Unauthorized: Only admins can change approved hours';
    END IF;

    UPDATE public.profiles
    SET total_hours = total_hours - OLD.hours,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;
