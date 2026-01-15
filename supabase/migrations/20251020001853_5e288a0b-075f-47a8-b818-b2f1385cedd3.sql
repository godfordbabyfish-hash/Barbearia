-- Update the app_role enum to include admin if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'barbeiro', 'cliente');
    END IF;
END $$;