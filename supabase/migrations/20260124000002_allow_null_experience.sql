-- Allow experience field to be NULL (make it optional)
-- This allows barbers to not have experience information

ALTER TABLE public.barbers
ALTER COLUMN experience DROP NOT NULL;

-- Update comment to reflect that it's optional
COMMENT ON COLUMN public.barbers.experience IS 'Anos de experiência do barbeiro (opcional). Pode ser NULL ou string vazia.';
