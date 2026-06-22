
-- 1) Restrict hour-proofs storage: org can only read proof files attached to hours submitted to their org
DROP POLICY IF EXISTS "Organizations can view proof files" ON storage.objects;
CREATE POLICY "Organizations can view proof files for their org"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'hour-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.volunteer_hours vh
    JOIN public.organizations o ON o.id = vh.organization_id
    WHERE o.user_id = auth.uid()
      AND vh.proof_file_url = storage.objects.name
  )
);

-- 2) Lock down event-images UPDATE/DELETE to the owning organization (path is "{org_id}/...")
DROP POLICY IF EXISTS "Users can update own event images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event images" ON storage.objects;

CREATE POLICY "Orgs can update own event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(storage.objects.name))[1]
  )
)
WITH CHECK (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

CREATE POLICY "Orgs can delete own event images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- Also scope INSERT to authenticated orgs writing under their own org folder
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Orgs can upload own event images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-images'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- 3) Restrict event_signups SELECT: users see own, orgs see signups for their events, admins all
DROP POLICY IF EXISTS "Users can view signups" ON public.event_signups;

CREATE POLICY "Users can view own signups"
ON public.event_signups
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Orgs can view signups for their events"
ON public.event_signups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE e.id = event_signups.event_id
      AND o.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all signups"
ON public.event_signups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Helper RPC so the Explore page can still show capacity counts without exposing rows
CREATE OR REPLACE FUNCTION public.get_event_signup_counts(_event_ids uuid[])
RETURNS TABLE(event_id uuid, signup_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT es.event_id, COUNT(*)::bigint
  FROM public.event_signups es
  WHERE es.event_id = ANY(_event_ids)
  GROUP BY es.event_id;
$$;

REVOKE ALL ON FUNCTION public.get_event_signup_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_signup_counts(uuid[]) TO authenticated;
