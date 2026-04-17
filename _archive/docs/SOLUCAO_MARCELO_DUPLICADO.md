# ✅ Solução: Deletar "Marcelo Barros" Duplicado

## 🔍 Situação Identificada

Você tem **dois barbeiros** na tabela:

1. **"Marcelo Barros"** (ID: `38b5534a-3fed-4b26-82d0-b18ee1e5c165`)
   - ❌ **Sem `user_id`** (não vinculado a usuário)
   - ❌ Sem perfil de usuário
   - ❌ Sem role de barbeiro
   - ✅ **Este é o duplicado que deve ser removido**

2. **"Marcelo Barroa"** (ID: `cf1fed64-974a-4b83-8081-d3faacfb11a2`)
   - ✅ **Com `user_id`** (vinculado a usuário)
   - ✅ Com perfil de usuário
   - ✅ Com role de barbeiro
   - ✅ **Este é o correto e deve permanecer**

---

## 🚀 Solução Rápida

### Passo 1: Verificar Dados Vinculados

Execute o script `deletar-marcelo-barros-duplicado.sql` no Supabase:

1. **Acesse:** SQL Editor do Supabase
2. **Cole o script** completo
3. **Execute** e veja os resultados

Isso vai mostrar:
- Quantos agendamentos estão vinculados ao barbeiro duplicado
- Se há outros dados (comissões, breaks, etc.)

### Passo 2: Deletar o Duplicado

**Se NÃO houver agendamentos importantes:**

```sql
-- Deletar o barbeiro duplicado "Marcelo Barros"
DELETE FROM public.barbers 
WHERE id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165'
AND user_id IS NULL;
```

**Se HOUVER agendamentos e quiser transferir para o barbeiro correto:**

```sql
-- 1. Transferir agendamentos para "Marcelo Barroa" (o correto)
UPDATE public.appointments
SET barber_id = 'cf1fed64-974a-4b83-8081-d3faacfb11a2'
WHERE barber_id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165';

-- 2. Depois deletar o duplicado
DELETE FROM public.barbers 
WHERE id = '38b5534a-3fed-4b26-82d0-b18ee1e5c165'
AND user_id IS NULL;
```

---

## ✅ Verificação Final

Após deletar, execute:

```sql
SELECT 
  id,
  name,
  user_id,
  visible
FROM public.barbers
WHERE LOWER(name) LIKE '%marcelo%'
ORDER BY name;
```

Deve aparecer apenas **"Marcelo Barroa"** agora.

---

## 📝 Resumo

- **Problema:** Barbeiro "Marcelo Barros" criado sem vinculação a usuário
- **Solução:** Deletar o registro duplicado (ID: `38b5534a-3fed-4b26-82d0-b18ee1e5c165`)
- **Resultado:** Apenas "Marcelo Barroa" (com usuário) permanecerá

---

**Status:** ✅ Pronto para executar
