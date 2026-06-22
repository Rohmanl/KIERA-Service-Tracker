
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_organization_approved_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status = 'approved'::account_status
     AND (OLD.account_status IS DISTINCT FROM NEW.account_status)
     AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_organization_approved_at ON public.organizations;
CREATE TRIGGER trg_set_organization_approved_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.set_organization_approved_at();
