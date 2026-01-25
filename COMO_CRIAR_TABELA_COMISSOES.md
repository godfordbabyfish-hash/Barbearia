# Como Criar as Tabelas de Comissões Individuais

Este guia explica como criar as tabelas necessárias para permitir comissões individuais por serviço e produto.

## 📊 Tabelas Necessárias

O sistema precisa de duas tabelas para comissões individuais:

1. **`barber_commissions`** - Comissões individuais por serviço (barbeiro + serviço)
2. **`barber_product_commissions`** - Comissões individuais por produto (barbeiro + produto)

> **Nota:** A tabela `barber_product_commissions` pode já existir no seu banco. Se você receber um erro ao executar o script, verifique primeiro se a tabela já existe.

## 📋 Pré-requisitos

- Acesso ao Supabase Dashboard
- Permissões de administrador no projeto

## 🚀 Passo a Passo

### 1. Acessar o SQL Editor do Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**

### 2. Executar o Script SQL

1. Abra o arquivo `criar-tabela-barber-commissions.sql` neste projeto
2. Copie todo o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione `Ctrl+Enter`)

### 3. Verificar a Criação

Após executar o script, você deve ver uma mensagem de sucesso:
```
NOTICE: Tabela barber_commissions criada com sucesso!
```

### 4. Verificar no Table Editor

1. No menu lateral do Supabase, clique em **Table Editor**
2. Você deve ver a tabela `barber_commissions` na lista
3. A tabela deve ter as seguintes colunas:
   - `id` (UUID)
   - `barber_id` (UUID, referência a `barbers`)
   - `service_id` (UUID, referência a `services`)
   - `commission_percentage` (DECIMAL)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

## ✅ O que o Script Faz

1. **Cria a tabela** `barber_commissions` com todas as colunas necessárias
2. **Cria índices** para melhorar a performance das consultas
3. **Habilita Row Level Security (RLS)** para segurança
4. **Cria políticas RLS** para:
   - Barbeiros podem ver suas próprias comissões
   - Admins e gestores podem ver, criar, atualizar e deletar todas as comissões
5. **Cria trigger** para atualizar automaticamente o campo `updated_at`

## 🔒 Segurança

As políticas RLS garantem que:
- Barbeiros só veem suas próprias comissões
- Apenas admins e gestores podem gerenciar comissões
- Todas as operações são auditadas com timestamps

## 📝 Notas Importantes

- O script é **seguro para executar múltiplas vezes** - ele usa `IF NOT EXISTS` e `DROP POLICY IF EXISTS`
- Se a tabela `barber_product_commissions` não existir, você precisará executar a migration correspondente também
- Após criar as tabelas, você poderá configurar comissões individuais por serviço e produto no painel administrativo
- O sistema suporta **dois tipos de comissão**:
  - **Comissões Individuais**: Percentual específico por barbeiro + serviço/produto (usando estas tabelas)
  - **Comissões Fixas**: Percentual fixo para todos os serviços/produtos de um barbeiro (tabela `barber_fixed_commissions`)

## 🎯 Próximos Passos

Após criar a tabela:

1. Recarregue a aplicação
2. Acesse o painel administrativo
3. Vá para a seção de **Comissões** ou **Financeiro**
4. Configure as comissões individuais para cada barbeiro e serviço

## ❓ Problemas Comuns

### Erro: "relation already exists"
- A tabela já existe. Isso é normal se você executar o script novamente.
- O script é seguro e não causará problemas.

### Erro: "permission denied"
- Verifique se você tem permissões de administrador no projeto
- Tente executar o script novamente

### Erro: "function has_role does not exist"
- A função `has_role` deve existir no seu banco de dados
- Verifique se todas as migrations foram executadas corretamente

## 📞 Suporte

Se encontrar problemas, verifique:
1. Os logs do SQL Editor no Supabase
2. A documentação do Supabase sobre RLS
3. As migrations existentes no projeto
