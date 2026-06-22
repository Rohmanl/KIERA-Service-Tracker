
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_signup_role text;
BEGIN
  -- Check if signup metadata indicates organization
  v_signup_role := NEW.raw_user_meta_data ->> 'signup_role';
  
  IF v_signup_role = 'organization' THEN
    v_role := 'organization';
  ELSE
    v_role := 'volunteer';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, name, school, grade)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'school',
    NEW.raw_user_meta_data ->> 'grade'
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  -- If organization, create the organizations record
  IF v_role = 'organization' THEN
    INSERT INTO public.organizations (user_id, org_name, contact_email, account_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'name', 'Organization'),
      COALESCE(NEW.raw_user_meta_data ->> 'contact_email', NEW.email),
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
