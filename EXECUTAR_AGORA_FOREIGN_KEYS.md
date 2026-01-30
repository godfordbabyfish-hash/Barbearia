# 🚨 EXECUTAR AGORA - Remover Foreign Keys

## PROBLEMA ATUAL
- Erro `crypto.randomUUID is not a function` foi CORRIGIDO ✅
- Erro ao gerar relatórios foi CORRIGIDO ✅
- Ainda existem foreign key constraints impedindo criação de perfis temporários ❌

## SOLUÇÃO IMEDIATA

### 1. Abrir Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (ícone de código)

### 2. Executar SQL
Copie e cole este SQL no editor:

```sql
-- REMOVER TODAS AS FOREIGN KEYS PROBLEMÁTICAS
-- Execute este SQL para remover TODAS as constraints que impedem perfis temporários

-- 1. Remover foreign key de appointments.client_id -> profiles.id
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

-- 2. Remover foreign key de profiles.id -> auth.users.id (se ainda existir)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Verificar se há outras constraints relacionadas
-- Remover qualquer constraint que referencie auth.users
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Buscar todas as constraints que referenciam auth.users
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || constraint_record.table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Removed constraint: % from table: %', 
                     constraint_record.constraint_name, constraint_record.table_name;
    END LOOP;
END $$;

-- Mensagem de confirmação
SELECT 'Todas as foreign keys problemáticas foram removidas!' as status;
```

### 3. Clicar em "RUN"
- Clique no botão **RUN** ou pressione `Ctrl+Enter`
- Aguarde a execução
- Deve aparecer: "Todas as foreign keys problemáticas foram removidas!"

## APÓS EXECUTAR

### ✅ O que foi corrigido:
1. **UUID Error**: Função `generateUUID()` agora é mais robusta
2. **Reports Error**: Queries do relatório foram corrigidas para evitar joins problemáticos
3. **Foreign Keys**: Serão removidas para permitir perfis temporários

### 🧪 Testar:
1. **Criar agendamento no painel do barbeiro** - deve funcionar sem erro
2. **Gerar relatório PDF** - deve funcionar sem erro 400
3. **Sistema não deve mais logar automaticamente** - perfis temporários

## PRÓXIMOS PASSOS
Após executar o SQL, teste:
1. Criar um agendamento pelo painel do barbeiro
2. Gerar um relatório PDF no painel admin
3. Verificar se não há mais login automático indesejado

---
**IMPORTANTE**: Execute o SQL acima AGORA no Supabase Dashboard para resolver todos os problemas pendentes!