-- Migration para atualizar a tabela barber_schedules com campos de almoço
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a tabela existe, se não existir, criar
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'barber_schedules') THEN
        CREATE TABLE public.barber_schedules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            open TIME NOT NULL DEFAULT '09:00',
            close TIME NOT NULL DEFAULT '20:00',
            closed BOOLEAN NOT NULL DEFAULT false,
            observation TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
            UNIQUE(barber_id, date)
        );
        
        -- Habilitar RLS
        ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;
        
        -- Políticas básicas
        CREATE POLICY "Permitir leitura pública" ON public.barber_schedules FOR SELECT USING (true);
        CREATE POLICY "Permitir tudo para autenticados" ON public.barber_schedules FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 2. Adicionar colunas de almoço se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'barber_schedules' AND column_name = 'has_lunch') THEN
        ALTER TABLE public.barber_schedules ADD COLUMN has_lunch BOOLEAN NOT NULL DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'barber_schedules' AND column_name = 'lunch_start') THEN
        ALTER TABLE public.barber_schedules ADD COLUMN lunch_start TIME DEFAULT '12:00';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'barber_schedules' AND column_name = 'lunch_end') THEN
        ALTER TABLE public.barber_schedules ADD COLUMN lunch_end TIME DEFAULT '13:00';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'barber_schedules' AND column_name = 'has_pause') THEN
        ALTER TABLE public.barber_schedules ADD COLUMN has_pause BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'barber_schedules' AND column_name = 'pause_start') THEN
        ALTER TABLE public.barber_schedules ADD COLUMN pause_start TIME DEFAULT '15:00';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'barber_schedules' AND column_name = 'pause_end') THEN
        ALTER TABLE public.barber_schedules ADD COLUMN pause_end TIME DEFAULT '15:30';
    END IF;
END $$;
