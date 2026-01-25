# 🚀 Como Permitir Execução Automática de Ações

## 📋 O Que Eu Posso Fazer Automaticamente

✅ **Posso executar:**
- Criar/editar arquivos
- Executar comandos no terminal
- Rodar scripts PowerShell
- Instalar pacotes npm
- Compilar código
- Executar testes
- Fazer commits no Git
- Aplicar migrations (se tiver credenciais)

## 🔐 O Que Preciso Para Executar Tudo Automaticamente

### 1. **Credenciais do Supabase** (Para aplicar migrations)

Para aplicar migrations automaticamente, preciso de uma das opções:

#### Opção A: Service Role Key (RECOMENDADO)
```powershell
# Adicionar ao ambiente ou arquivo .env.local
$env:SUPABASE_SERVICE_ROLE_KEY = "sua_service_role_key_aqui"
```

**Onde encontrar:**
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/api
2. Copie a **Service Role Key** (secret)
3. Adicione ao ambiente ou me forneça

#### Opção B: Senha do Banco de Dados
```powershell
# Executar script com senha
.\aplicar-migration-automatico.ps1 -DatabasePassword "sua_senha_db"
```

**Onde encontrar:**
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database
2. Copie a senha do banco
3. Me forneça ou configure no script

### 2. **Supabase CLI Configurado**

Para usar `supabase db push`:

```powershell
# 1. Fazer login
supabase login

# 2. Linkar projeto
supabase link --project-ref wabefmgfsatlusevxyfo --password "sua_senha_db"
```

### 3. **Permissões de Execução PowerShell**

Se scripts não executarem:

```powershell
# Permitir execução de scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🎯 Exemplo: Aplicar Migration Automaticamente

### Com Service Role Key:
```powershell
# Configurar variável de ambiente
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGc..."

# Executar script
.\aplicar-migration-automatico.ps1
```

### Com Senha do Banco:
```powershell
.\aplicar-migration-automatico.ps1 -DatabasePassword "sua_senha_aqui"
```

## 📝 O Que Fazer Agora

### Para aplicar a migration de comissões de produtos:

**Método 1 - Automático (se tiver credenciais):**
```powershell
# Me forneça a Service Role Key ou senha do banco
# E eu executo automaticamente
```

**Método 2 - Manual (sempre funciona):**
1. O script já abriu o SQL Editor no navegador
2. Cole o SQL (está no arquivo `supabase/migrations/20260124000003_add_barber_product_commissions.sql`)
3. Execute (Ctrl+Enter)

## 🔄 Próximas Vezes

Se você me fornecer:
- ✅ Service Role Key do Supabase
- ✅ Ou senha do banco de dados
- ✅ Ou configurar Supabase CLI linkado

**Eu consigo executar TUDO automaticamente:**
- ✅ Aplicar migrations
- ✅ Criar tabelas
- ✅ Atualizar tipos TypeScript
- ✅ Fazer deploy
- ✅ Configurar variáveis de ambiente
- ✅ E muito mais!

## 💡 Dica de Segurança

**NÃO compartilhe credenciais em conversas públicas!**

Se quiser me dar acesso:
1. Configure variáveis de ambiente localmente
2. Ou me diga para usar scripts que você já tem configurados
3. Ou me forneça temporariamente em mensagem privada

---

## ✅ Status Atual

- ✅ Migration criada: `20260124000003_add_barber_product_commissions.sql`
- ✅ Hook criado: `useBarberProductCommissions.ts`
- ⏳ **Aguardando aplicação da migration**

**Próximo passo:** Aplicar a migration (manual ou automático)
