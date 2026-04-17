# 🔧 Como Corrigir Barbeiros Duplicados

## 🔍 Problema Identificado

Você está vendo dois "Marcelo" na interface, mas só há um usuário cadastrado. Isso pode acontecer por:

1. **Dois registros na tabela `barbers`** com o mesmo nome, mas IDs diferentes
2. **Um barbeiro sem `user_id`** (não vinculado a usuário) e outro com `user_id`
3. **Barbeiros criados manualmente** sem passar pelo fluxo completo de criação

---

## 📋 Passo 1: Verificar o Problema

Execute o script SQL no Supabase:

1. **Acesse:** https://supabase.com/dashboard/project/{seu_project_id}/sql/new
2. **Cole o conteúdo** de `verificar-barbeiros-duplicados.sql`
3. **Execute** e veja os resultados

Isso vai mostrar:
- Todos os barbeiros com nome "Marcelo"
- Se há duplicações
- Qual tem usuário vinculado e qual não tem

---

## 🛠️ Passo 2: Corrigir o Problema

### Opção A: Deletar o Barbeiro Duplicado (Sem Usuário)

Se um dos "Marcelo" não tem `user_id` (não está vinculado a usuário):

```sql
-- CUIDADO: Verifique o ID antes de deletar!
-- Substitua {ID_DO_BARBEIRO_DUPLICADO} pelo ID correto

-- 1. Primeiro, verifique qual é o duplicado (sem user_id)
SELECT id, name, user_id 
FROM public.barbers 
WHERE LOWER(name) LIKE '%marcelo%';

-- 2. Se houver agendamentos vinculados, você pode:
--    a) Transferir para o barbeiro correto, OU
--    b) Deletar os agendamentos (se não forem importantes)

-- 3. Deletar o barbeiro duplicado (sem user_id)
DELETE FROM public.barbers 
WHERE id = '{ID_DO_BARBEIRO_DUPLICADO}' 
AND user_id IS NULL;
```

### Opção B: Mesclar os Barbeiros

Se ambos têm dados importantes:

```sql
-- 1. Identificar qual é o barbeiro "principal" (com user_id)
--    e qual é o "duplicado" (sem user_id ou com user_id diferente)

-- 2. Transferir agendamentos do duplicado para o principal
UPDATE public.appointments
SET barber_id = '{ID_DO_BARBEIRO_PRINCIPAL}'
WHERE barber_id = '{ID_DO_BARBEIRO_DUPLICADO}';

-- 3. Transferir comissões (se houver)
UPDATE public.barber_commissions
SET barber_id = '{ID_DO_BARBEIRO_PRINCIPAL}'
WHERE barber_id = '{ID_DO_BARBEIRO_DUPLICADO}';

-- 4. Transferir breaks (se houver)
UPDATE public.barber_breaks
SET barber_id = '{ID_DO_BARBEIRO_PRINCIPAL}'
WHERE barber_id = '{ID_DO_BARBEIRO_DUPLICADO}';

-- 5. Transferir disponibilidade (se houver)
UPDATE public.barber_availability
SET barber_id = '{ID_DO_BARBEIRO_PRINCIPAL}'
WHERE barber_id = '{ID_DO_BARBEIRO_DUPLICADO}';

-- 6. Deletar o barbeiro duplicado
DELETE FROM public.barbers 
WHERE id = '{ID_DO_BARBEIRO_DUPLICADO}';
```

### Opção C: Renomear um dos Barbeiros

Se são pessoas diferentes com o mesmo nome:

```sql
-- Renomear um dos barbeiros
UPDATE public.barbers
SET name = 'Marcelo Silva'  -- ou outro nome
WHERE id = '{ID_DO_BARBEIRO}';
```

---

## ✅ Passo 3: Verificar se Foi Corrigido

Após corrigir, execute novamente:

```sql
SELECT 
  id,
  name,
  user_id,
  visible
FROM public.barbers
WHERE LOWER(name) LIKE '%marcelo%'
ORDER BY created_at;
```

Deve aparecer apenas **um** "Marcelo" agora.

---

## 🔒 Prevenção Futura

Para evitar que isso aconteça novamente:

1. **Sempre use o painel admin** para criar barbeiros (não criar manualmente no banco)
2. **Verifique antes de criar** se já existe um barbeiro com o mesmo nome
3. **Use nomes únicos** ou adicione sobrenome/identificador

---

## 📝 Script Completo de Limpeza (Use com Cuidado!)

```sql
-- ATENÇÃO: Execute com cuidado! Faça backup antes!

-- 1. Identificar barbeiros duplicados (mesmo nome, sem user_id)
WITH duplicados AS (
  SELECT 
    name,
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY 
      CASE WHEN user_id IS NOT NULL THEN 0 ELSE 1 END,
      created_at
    ) as rn
  FROM public.barbers
  WHERE visible = true
)
SELECT 
  d.name,
  d.id as id_para_deletar,
  d.user_id,
  (SELECT id FROM public.barbers b2 
   WHERE b2.name = d.name 
   AND b2.user_id IS NOT NULL 
   LIMIT 1) as id_principal
FROM duplicados d
WHERE d.rn > 1
AND d.user_id IS NULL;

-- 2. Se os resultados estiverem corretos, descomente e execute:
-- DELETE FROM public.barbers 
-- WHERE id IN (
--   SELECT id FROM duplicados WHERE rn > 1 AND user_id IS NULL
-- );
```

---

## ⚠️ Importante

- **Sempre faça backup** antes de deletar dados
- **Verifique agendamentos** vinculados ao barbeiro antes de deletar
- **Teste em ambiente de desenvolvimento** primeiro, se possível

---

**Última atualização:** Janeiro 2026
