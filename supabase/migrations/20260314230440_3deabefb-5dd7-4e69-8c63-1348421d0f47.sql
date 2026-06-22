
-- Add 'organization' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'organization';

-- Create account_status enum
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected');

-- Create organizations table for org-specific profile data
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name text NOT NULL,
  contact_email text NOT NULL,
  account_status public.account_status NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- RLS: orgs can view their own record
CREATE POLICY "Organizations can view own record" ON public.organizations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- RLS: admins can view all orgs
CREATE POLICY "Admins can view all organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: admins can update all orgs (approve/reject)
CREATE POLICY "Admins can update organizations" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: authenticated users can insert their own org record
CREATE POLICY "Users can insert own organization" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
