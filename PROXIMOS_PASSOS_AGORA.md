# 🔧 PRÓXIMOS PASSOS - RESOLVER MIGRATION

## 📋 SITUAÇÃO ATUAL

Você executou a SQL no Supabase Dashboard e recebeu **"Migration completed successfully!"**, mas o sistema ainda apresenta erro ao criar agendamentos.

## 🔍 VERIFICAR SE MIGRATION FOI APLICADA

### **PASSO 1: Execute SQL de Verificação**

No **Supabase Dashboard > SQL Editor**, execute:

```sql
-- VERIFICAR STATUS DA MIGRATION
SELECT 
    'is_temp_user column exists' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_temp_user'
    ) THEN '✅ SIM' ELSE '❌ NÃO' END as status

UNION ALL

SELECT 
    'foreign key constraint removed' as check_name,
    CASE WHEN NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' AND constraint_name = 'profiles_id_fkey'
    ) THEN '✅ SIM' ELSE '❌ NÃO' END as status

UNION ALL

SELECT 
    'payment_method supports cartao' as check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%payment_method%' AND check_clause LIKE '%cartao%'
    ) THEN '✅ SIM' ELSE '❌ NÃO' END as status;
```

### **PASSO 2: Interpretar Resultados**

**Se todos mostrarem ✅ SIM:**
- Migration foi aplicada corretamente
- Problema pode ser cache do navegador

**Se algum mostrar ❌ NÃO:**
- Migration não foi aplicada completamente
- Execute novamente a SQL completa

## 🧹 LIMPAR CACHE DO NAVEGADOR

### **PASSO 3: Forçar Atualização**

1. **Feche completamente o navegador**
2. **Abra novamente**
3. **Vá para:** http://localhost:8080
4. **Pressione:** `Ctrl + Shift + R` (força reload sem cache)
5. **Ou:** `Ctrl + F5`

### **PASSO 4: Testar Modo Incógnito**

1. **Abra janela incógnita/privada**
2. **Acesse:** http://localhost:8080
3. **Faça login como barbeiro**
4. **Teste criar agendamento**

## 🔄 SE AINDA NÃO FUNCIONAR

### **OPÇÃO A: Re-executar Migration Completa**

Execute novamente no **Supabase Dashboard**:

```sql
-- FORÇAR APLICAÇÃO DA MIGRATION
BEGIN;

-- Remover constraint se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
        RAISE NOTICE 'Foreign key constraint removed';
    END IF;
END $$;

-- Adicionar coluna se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_temp_user BOOLEAN DEFAULT FALSE;

-- Definir UUID padrão
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verificar payment_method
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%payment_method%' 
        AND check_clause LIKE '%cartao%'
    ) THEN
        -- Remover constraint antiga
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
            END IF;
        END;
        
        -- Adicionar nova constraint
        ALTER TABLE public.appointments 
        ADD CONSTRAINT appointments_payment_method_check 
        CHECK (payment_method IN ('pix', 'dinheiro', 'cartao'));
    END IF;
END $$;

COMMIT;

SELECT 'Migration re-applied successfully!' as status;
```

### **OPÇÃO B: Testar Inserção Manual**

Teste se consegue inserir um perfil temporário:

```sql
-- TESTE DE INSERÇÃO
INSERT INTO public.profiles (id, name, phone, is_temp_user) 
VALUES (gen_random_uuid(), 'TESTE TEMP', '+55 11 99999-9999', true)
RETURNING id, name, is_temp_user;

-- LIMPAR TESTE
DELETE FROM public.profiles WHERE name = 'TESTE TEMP';
```

## 📞 RESULTADO ESPERADO

Após resolver a migration:

- ✅ **Agendamentos manuais funcionam** sem erro
- ✅ **Não há login automático** indevido
- ✅ **Sistema cria perfis temporários** corretamente
- ✅ **Todas as funcionalidades ativas**

## 🚨 SE NADA FUNCIONAR

Como último recurso, implementei um **fallback automático** no código que:

1. **Tenta criar perfil temporário** (método ideal)
2. **Se falhar, usa método alternativo** (cria usuário auth e faz logout)
3. **Mantém funcionalidade** mesmo sem migration

---

**Execute os passos acima e me informe o resultado da verificação SQL!** 🔍