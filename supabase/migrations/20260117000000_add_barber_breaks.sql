-- Create barber_breaks table for storing barber break times
CREATE TABLE IF NOT EXISTS public.barber_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_end_after_start CHECK (end_time > start_time),
  CONSTRAINT unique_barber_date_start UNIQUE (barber_id, date, start_time)
);

-- Add comment to document the table
COMMENT ON TABLE public.barber_breaks IS 'Horários de pausa dos barbeiros que bloqueiam agendamentos';

-- Create index for faster queries by barber and date
CREATE INDEX IF NOT EXISTS idx_barber_breaks_barber_date ON public.barber_breaks(barber_id, date);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_barber_breaks_date ON public.barber_breaks(date);

-- Enable Row Level Security
ALTER TABLE public.barber_breaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_breaks
-- Barbers can view their own breaks
CREATE POLICY "Barbers can view their own breaks"
  ON public.barber_breaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Barbers can insert their own breaks
CREATE POLICY "Barbers can insert their own breaks"
  ON public.barber_breaks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Barbers can update their own breaks
CREATE POLICY "Barbers can update their own breaks"
  ON public.barber_breaks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Barbers can delete their own breaks
CREATE POLICY "Barbers can delete their own breaks"
  ON public.barber_breaks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.barbers
      WHERE barbers.id = barber_breaks.barber_id
      AND barbers.user_id = auth.uid()
    )
  );

-- Admins can manage all breaks
CREATE POLICY "Admins can manage all breaks"
  ON public.barber_breaks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Everyone can view breaks (needed for booking availability)
CREATE POLICY "Everyone can view breaks for booking"
  ON public.barber_breaks FOR SELECT
  USING (true);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_barber_breaks_updated_at
  BEFORE UPDATE ON public.barber_breaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
