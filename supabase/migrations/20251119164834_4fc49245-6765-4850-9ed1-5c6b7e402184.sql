-- Create table to store push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_push_subscriptions_barber_id ON public.push_subscriptions(barber_id);
CREATE INDEX idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX idx_push_subscriptions_is_active ON public.push_subscriptions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Barbers can view their own subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can insert their own subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can update their own subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Barbers can delete their own subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = push_subscriptions.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();