
ALTER TYPE public.hour_status ADD VALUE IF NOT EXISTS 'pending_external_org';
ALTER TYPE public.hour_status ADD VALUE IF NOT EXISTS 'org_verified';
