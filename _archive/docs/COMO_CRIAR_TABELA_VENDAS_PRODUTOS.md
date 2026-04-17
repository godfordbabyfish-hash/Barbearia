# Como Criar a Tabela de Vendas de Produtos

Este guia explica como criar a tabela `product_sales` para permitir que barbeiros registrem vendas de produtos do shop.

## 📋 Pré-requisitos

- Acesso ao Supabase Dashboard
- Permissões de administrador no projeto
- Tabela `products` já criada
- Tabela `barbers` já criada

## 🚀 Passo a Passo

### 1. Acessar o SQL Editor do Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **New Query**

### 2. Executar o Script SQL

1. Abra o arquivo `criar-tabela-product-sales.sql` neste projeto
2. Copie todo o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione `Ctrl+Enter`)

### 3. Verificar a Criação

Após executar o script, você deve ver uma mensagem de sucesso:
```
NOTICE: Tabela product_sales criada com sucesso!
```

### 4. Verificar no Table Editor

1. No menu lateral do Supabase, clique em **Table Editor**
2. Você deve ver a tabela `product_sales` na lista
3. A tabela deve ter as seguintes colunas:
   - `id` (UUID)
   - `barber_id` (UUID, referência a `barbers`)
   - `product_id` (UUID, referência a `products`)
   - `quantity` (INTEGER)
   - `unit_price` (DECIMAL)
   - `total_price` (DECIMAL)
   - `commission_percentage` (DECIMAL)
   - `commission_value` (DECIMAL)
   - `sale_date` (DATE)
   - `sale_time` (TIME)
   - `notes` (TEXT)
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

## ✅ O que o Script Faz

1. **Cria a tabela** `product_sales` com todas as colunas necessárias
2. **Cria índices** para melhorar a performance das consultas
3. **Habilita Row Level Security (RLS)** para segurança
4. **Cria políticas RLS** para:
   - Barbeiros podem ver e criar suas próprias vendas
   - Admins e gestores podem ver e gerenciar todas as vendas
5. **Cria trigger** para atualizar automaticamente o campo `updated_at`

## 🔒 Segurança

As políticas RLS garantem que:
- Barbeiros só veem e criam suas próprias vendas
- Apenas admins e gestores podem gerenciar todas as vendas
- Todas as operações são auditadas com timestamps

## 📝 Funcionalidades

Após criar a tabela, os barbeiros poderão:

1. **Registrar vendas de produtos** no painel do barbeiro
2. **Ver histórico de vendas** com data, hora, produto, quantidade e comissão
3. **Acompanhar comissões** de produtos no painel financeiro
4. **Ver estatísticas** de vendas integradas ao painel financeiro

## 🎯 Integração com o Sistema

A tabela `product_sales` se integra com:

- **`products`**: Referência aos produtos vendidos
- **`barbers`**: Referência ao barbeiro que realizou a venda
- **`barber_product_commissions`**: Usado para calcular a comissão automaticamente
- **`barber_fixed_commissions`**: Usado como fallback se não houver comissão individual

## 📊 Cálculo de Comissão

O sistema calcula a comissão automaticamente:

1. Primeiro verifica se existe comissão individual em `barber_product_commissions`
2. Se não existir, usa a comissão fixa de produtos de `barber_fixed_commissions`
3. Calcula: `commission_value = total_price * commission_percentage / 100`

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

### Erro: "foreign key constraint"
- Verifique se as tabelas `barbers` e `products` existem
- Certifique-se de que há barbeiros e produtos cadastrados

## 📞 Suporte

Se encontrar problemas, verifique:
1. Os logs do SQL Editor no Supabase
2. A documentação do Supabase sobre RLS
3. As migrations existentes no projeto
