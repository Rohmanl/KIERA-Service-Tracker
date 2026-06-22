CREATE POLICY "Users can view their own adjustments"
ON public.admin_adjustments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);