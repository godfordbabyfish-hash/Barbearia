# Corrigir Erro 403 ao Solicitar Vale

## Problema
Barbeiros recebem erro **403 Forbidden** ao tentar solicitar vale direto do painel.

## Causa
A política RLS (Row Level Security) da tabela `barber_advances` não permite que barbeiros insiram seus próprios vales. Apenas admins/gestores tinham permissão.

## Solução

### Opção 1: Via Supabase Dashboard (Mais Fácil)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor**
3. Cole o seguinte SQL:

```sql
-- Adicionar política RLS para permitir barbeiros solicitarem vales
DROP POLICY IF EXISTS "Barbers can request own advances" ON public.barber_advances;
CREATE POLICY "Barbers can request own advances"
  ON public.barber_advances
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.barbers b
      WHERE b.id = barber_advances.barber_id
        AND b.user_id = auth.uid()
    )
  );
```

4. Clique em **Run** (ou Ctrl+Enter)
5. Pronto! ✅

### Opção 2: Via CLI

```powershell
supabase db push
```

## O que foi corrigido

- ✅ Barbeiros agora podem criar vales para si mesmos
- ✅ Admins/gestores continuam podendo criar vales para qualquer barbeiro
- ✅ Mantém a segurança: cada barbeiro só pode criar vales para sua própria conta

## Teste

1. Faça login como barbeiro
2. Vá para o painel financeiro
3. Clique em "Solicitar Vale"
4. Preencha os dados e clique em "Solicitar"
5. Deve aparecer mensagem de sucesso ✅

## Campos da Solicitação

- **Valor do Vale**: Valor em R$ (não pode exceder comissão disponível)
- **Data da Solicitação**: Data do vale (não pode ser futura)
- **Motivo**: Descrição do motivo da solicitação

## Próximos Passos

Após solicitar o vale, o gestor/admin pode:
- ✅ Aprovar o vale
- ❌ Rejeitar o vale
- 🗑️ Remover o vale

O vale aprovado será descontado da comissão do barbeiro.
