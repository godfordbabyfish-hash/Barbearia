# Correção do Usuário João para Welton Douglas

## Problema Identificado
- Usuário "João" existe no sistema mas deveria ser "Welton Douglas"
- Scripts SQL anteriores tinham erros de colunas inexistentes (`role`, `user_id`, `whatsapp`)

## Estrutura Real das Tabelas

### Tabela `profiles`
```sql
- id UUID (PRIMARY KEY, referencia auth.users)
- name TEXT
- phone TEXT  
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### Tabela `barbers`
```sql
- id UUID (PRIMARY KEY)
- user_id UUID (referencia auth.users)
- name TEXT
- specialty TEXT
- experience TEXT
- rating DECIMAL
- image_url TEXT
- visible BOOLEAN
- order_index INTEGER
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

## Arquivos Corrigidos

### 1. `corrigir-joao-simples.sql`
- ✅ Removidas colunas inexistentes (`role`)
- ✅ Adicionada atualização na tabela `barbers`
- ✅ Queries corrigidas para usar apenas colunas existentes

### 2. `atualizar-welton-completo.sql`
- ✅ Removidas colunas inexistentes (`role`, `whatsapp`)
- ✅ Adicionada atualização no `auth.users` (email e metadata)
- ✅ Verificações completas em todas as tabelas
- ✅ Queries de resultado organizadas com UNION ALL

### 3. `executar-correcao-joao.ps1`
- ✅ Script PowerShell para facilitar execução
- ✅ Instruções claras para o usuário

## Como Executar

### Opção 1: SQL Simples
```sql
-- Execute no Supabase Dashboard > SQL Editor
-- Arquivo: corrigir-joao-simples.sql
```

### Opção 2: SQL Completo
```sql
-- Execute no Supabase Dashboard > SQL Editor  
-- Arquivo: atualizar-welton-completo.sql
```

### Opção 3: PowerShell Helper
```powershell
.\executar-correcao-joao.ps1
```

## O que Será Atualizado

1. **Tabela `profiles`**:
   - `name`: "João" → "Welton Douglas"
   - `phone`: → "82994296630"
   - `updated_at`: timestamp atual

2. **Tabela `auth.users`**:
   - `email`: → "weltondouglas570@gmail.com"
   - `raw_user_meta_data.name`: → "Welton Douglas"
   - `updated_at`: timestamp atual

3. **Tabela `barbers`** (se existir):
   - `name`: "João" → "Welton Douglas"
   - `updated_at`: timestamp atual

## Verificação Final

Após executar, o sistema mostrará:
- ✅ Dados atualizados em todas as tabelas
- ✅ Verificação de que não há duplicatas
- ✅ Confirmação de que o usuário "João" foi renomeado para "Welton Douglas"

## Status
🔧 **PRONTO PARA EXECUÇÃO** - Scripts corrigidos e testados