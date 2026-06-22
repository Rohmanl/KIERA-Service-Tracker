CREATE TABLE public.admin_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  old_value numeric NOT NULL,
  new_value numeric NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert adjustments"
ON public.admin_adjustments FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

CREATE POLICY "Admins can view all adjustments"
ON public.admin_adjustments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));