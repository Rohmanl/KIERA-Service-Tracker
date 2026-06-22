
-- Drop the overly permissive SELECT policy
DROP POLICY "Authenticated users can view all profiles" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
