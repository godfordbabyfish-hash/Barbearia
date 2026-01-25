# ✅ Próximos Passos Após Vincular o Projeto

## 🎯 Status Atual

✅ **Projeto vinculado com sucesso!**
- Comando executado: `supabase link --project-ref wabefmgfsatlusevxyfo --password 'pFgNQxhpdCkmxED1'`
- Resultado: `Finished supabase link.`

---

## 📝 O Que Fazer Agora

### Opção 1: Aplicar Migration via CLI (Recomendado) ✅

**No mesmo terminal onde você fez o link**, execute:

```powershell
supabase db push
```

Isso vai aplicar todas as migrations pendentes, incluindo:
- ✅ `20260124000003_add_barber_product_commissions.sql` (nova tabela de comissões de produtos)

**O que vai acontecer:**
1. O CLI vai verificar quais migrations ainda não foram aplicadas
2. Vai aplicar apenas as novas
3. Vai criar a tabela `barber_product_commissions` com todas as políticas RLS

---

### Opção 2: Aplicar Migration Específica via SQL Editor

Se preferir aplicar manualmente:

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new
2. **Cole o conteúdo** de: `supabase/migrations/20260124000003_add_barber_product_commissions.sql`
3. **Execute** (Ctrl+Enter)

---

## 🔍 Verificar se Funcionou

Depois de aplicar, verifique se a tabela foi criada:

```sql
-- Execute no SQL Editor
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'barber_product_commissions'
);
```

**Resultado esperado:** `true`

---

## ✅ Depois de Aplicar a Migration

### 1. Atualizar Tipos TypeScript (Opcional)

Se quiser atualizar os tipos do Supabase:

```powershell
npx supabase gen types typescript --project-id wabefmgfsatlusevxyfo > src/integrations/supabase/types.ts
```

### 2. Usar o Hook Criado

O hook `useBarberProductCommissions` já está pronto para uso:

```typescript
import { useBarberProductCommissions } from '@/hooks/useBarberProductCommissions';

// Em um componente
const { 
  commissions, 
  loading, 
  updateCommission,
  calculateCommission 
} = useBarberProductCommissions(barberId);
```

---

## 🎯 Resumo

**Execute agora no terminal onde fez o link:**

```powershell
supabase db push
```

**Isso vai:**
- ✅ Aplicar a migration de comissões de produtos
- ✅ Criar a tabela `barber_product_commissions`
- ✅ Criar todas as políticas RLS
- ✅ Criar índices e triggers

**Depois disso, tudo estará pronto para usar!** 🚀
