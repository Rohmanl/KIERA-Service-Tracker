-- Explicitly deny anonymous/unauthenticated access to profiles
CREATE POLICY "Deny anonymous access"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);