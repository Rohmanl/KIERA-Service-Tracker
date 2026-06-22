CREATE OR REPLACE FUNCTION public.update_total_hours()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Recalculate total_hours from approved records instead of incrementing/decrementing
  -- This prevents data inconsistency from double-clicks or race conditions
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    -- Defense-in-depth: verify caller is admin or system (NULL uid = internal/system call)
    IF NEW.status = 'approved' OR OLD.status = 'approved' THEN
      IF NOT (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can change approval status';
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
$function$;