
-- Create events table for organization-posted events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time NOT NULL,
  location text NOT NULL,
  max_capacity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create event signups table
CREATE TABLE public.event_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  signed_up_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_signups ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Organizations can manage own events"
  ON public.events FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view events"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

-- Event signups policies
CREATE POLICY "Users can sign up for events"
  ON public.event_signups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view signups"
  ON public.event_signups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can cancel own signup"
  ON public.event_signups FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
