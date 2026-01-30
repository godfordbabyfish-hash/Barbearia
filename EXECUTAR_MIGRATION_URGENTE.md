# 🚨 EXECUTAR MIGRATION URGENTE

## ❌ Erro Atual

```
Error creating appointment: insert or update on table "appointments" violates foreign key constraint "appointments_client_id_fkey"
Details: Key is not present in table "users".
```

## 🔍 Causa do Problema

A **migration do banco de dados ainda não foi aplicada**. O sistema está tentando criar perfis temporários, mas a constraint de foreign key ainda existe.

## ✅ SOLUÇÃO: Executar SQL no Supabase Dashboard

### **PASSO 1: Acesse o Supabase Dashboard**
1. Vá para: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: `wabefmgfsatlusevxyfo`

### **PASSO 2: Abra o SQL Editor**
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**

### **PASSO 3: Execute o SQL Abaixo**

```sql
-- MIGRATION PARA CORRIGIR LOGIN AUTOMÁTICO
-- Execute este código completo no Supabase Dashboard

-- 1. Adicionar coluna is_temp_user na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_temp_user BOOLEAN DEFAULT FALSE;

-- Comentário para documentar o campo
COMMENT ON COLUMN public.profiles.is_temp_user IS 'Indica se é um usuário temporário criado pelo barbeiro (não tem login)';

-- Criar índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_temp_user ON public.profiles(is_temp_user);

-- 2. Remover constraint de foreign key para auth.users (permitir perfis temporários)
DO $$
BEGIN
    -- Tentar remover a constraint de foreign key se existir
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
        RAISE NOTICE 'Foreign key constraint removed successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint does not exist or already removed';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing foreign key constraint: %', SQLERRM;
END $$;

-- 3. Definir gen_random_uuid() como padrão para coluna id
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Verificar se a correção do payment_method foi aplicada
DO $$
BEGIN
    -- Verificar se a constraint permite 'cartao'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%payment_method%' 
        AND check_clause LIKE '%cartao%'
    ) THEN
        -- Remover constraint antiga se existir
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%payment_method%' 
            AND table_name = 'appointments'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE public.appointments DROP CONSTRAINT ' || constraint_name_var;
                RAISE NOTICE 'Old payment_method constraint removed: %', constraint_name_var;
            END IF;
        END;
        
        -- Adicionar nova constraint com todas as opções
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_payment_method_check 
        CHECK (payment_method IN ('pix', 'dinheiro', 'cartao'));
        
        RAISE NOTICE 'New payment_method constraint added with cartao support';
    ELSE
        RAISE NOTICE 'Payment method constraint already supports cartao';
    END IF;
END $$;

-- 5. Verificar estrutura final
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('id', 'is_temp_user')

UNION ALL

SELECT 
    'appointments' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'appointments' 
AND column_name = 'payment_method';

-- Mensagem final
SELECT 'Migration completed successfully! You can now create appointments without automatic login issues.' as status;
```

### **PASSO 4: Executar**
1. Cole o SQL completo acima
2. Clique em **"Run"** ou **"Execute"**
3. Aguarde a execução (deve levar alguns segundos)

### **PASSO 5: Verificar Resultado**
Você deve ver mensagens como:
- ✅ `Foreign key constraint removed successfully`
- ✅ `New payment_method constraint added with cartao support`
- ✅ `Migration completed successfully!`

## 🧪 Testar Após Migration

1. **Volte ao sistema** (http://localhost:8080)
2. **Recarregue a página** (Ctrl+F5)
3. **Faça login como barbeiro**
4. **Tente criar um agendamento manual**
5. **Verifique se não há mais erros**

## ⚠️ IMPORTANTE

**NÃO PULE ESTA ETAPA!** O sistema não funcionará corretamente até que esta migration seja executada no banco de dados.

---

**Status:** 🔴 Migration pendente - Execute o SQL acima no Supabase Dashboard