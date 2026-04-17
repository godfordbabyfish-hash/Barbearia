# 📚 Referência Completa do Projeto - Barbearia Raimundos

## 🎯 Visão Geral

**Projeto:** Sistema de gestão de barbearia com agendamentos online
**Stack:** React + TypeScript + Vite + Supabase + Tailwind CSS + shadcn-ui
**Repositório:** https://github.com/godfordbabyfish-hash/Barbearia.git
**Supabase Project ID:** `wabefmgfsatlusevxyfo`

---

## 🗂️ Estrutura do Projeto

### Diretórios Principais
```
src/
├── components/          # Componentes React reutilizáveis
│   ├── admin/          # Componentes do painel admin
│   ├── ui/             # Componentes shadcn-ui
│   └── ...
├── pages/              # Páginas principais
│   ├── AdminDashboard.tsx
│   ├── BarbeiroDashboard.tsx
│   ├── ClienteDashboard.tsx
│   ├── FilaDaBarbearia.tsx
│   └── ...
├── contexts/           # Contextos React (Auth, etc.)
├── hooks/              # Custom hooks
└── integrations/      # Integrações externas
    └── supabase/      # Cliente Supabase e tipos

supabase/
├── migrations/         # Migrations SQL
├── functions/          # Edge Functions (Deno)
│   ├── api/           # API principal
│   ├── whatsapp-*/    # Funções WhatsApp
│   └── ...
└── config.toml        # Configuração Supabase
```

---

## 🔧 Configurações Essenciais

### 1. Variáveis de Ambiente

**Frontend (Vite):**
```env
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
```

**Supabase Functions (Secrets):**
```env
EVOLUTION_API_URL=https://evolution-api-barbearia.fly.dev
EVOLUTION_API_KEY=testdaapi2026
SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Supabase Config

**Project ID:** `wabefmgfsatlusevxyfo`
**URL Base:** `https://wabefmgfsatlusevxyfo.supabase.co`
**Dashboard:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo

---

## 🗄️ Banco de Dados (Supabase PostgreSQL)

### Tabelas Principais

1. **profiles** - Perfis de usuários
2. **user_roles** - Roles dos usuários (admin, gestor, barbeiro, cliente)
3. **barbers** - Informações dos barbeiros
4. **services** - Serviços oferecidos
5. **appointments** - Agendamentos
   - `booking_type`: 'local' | 'online' | 'api' | 'manual'
6. **products** - Produtos da loja
7. **site_config** - Configurações do site (JSONB)
8. **whatsapp_queue** - Fila de mensagens WhatsApp
9. **barber_commissions** - Comissões dos barbeiros

### Migrations Importantes

- `20260124000000_add_manual_booking_type.sql` - Adiciona tipo 'manual' para agendamentos retroativos
- `20260124000001_allow_barbers_create_profiles.sql` - Permite barbeiros criarem perfis de clientes

### Como Aplicar Migrations

**Via Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new
2. Cole o conteúdo do arquivo SQL
3. Execute

**Via CLI:**
```bash
npx supabase db push
```

**Via Script PowerShell:**
```powershell
.\executar-migration-manual-booking.ps1
```

---

## 🔌 Integrações

### 1. Evolution API / WhatsApp Bot (Railway)

**Opção 1 - Railway (Recomendado - Gratuito):**
- **Repositório:** https://github.com/godfordbabyfish-hash/whatsapp-bot-barbearia
- **URL:** `https://whatsapp-bot-xxxx.up.railway.app` (após deploy)
- **API Key:** `testdaapi2026`

**Opção 2 - Fly.io (Alternativa):**
- **URL:** `https://evolution-api-barbearia.fly.dev`
- **API Key:** `testdaapi2026`

**Funções relacionadas:**
- `whatsapp-notify` - Envia notificações
- `whatsapp-process-queue` - Processa fila de mensagens
- `whatsapp-manager` - Gerencia instâncias
- `whatsapp-reminder` - Envia lembretes

**Configurar URL no Supabase:**
```powershell
# Para Railway
.\atualizar-railway-url.ps1 -RailwayUrl "https://whatsapp-bot-xxxx.up.railway.app"

# Para Fly.io
.\atualizar-supabase-url.ps1
```

**📖 Guia Completo:** Veja `CONFIGURAR_WHATSAPP_RAILWAY.md`

### 2. GitHub

**Repositório:** `https://github.com/godfordbabyfish-hash/Barbearia.git`
**Branch Principal:** `main`

**Comandos Git:**
```bash
git status
git add .
git commit -m "mensagem"
git push origin main
```

---

## 🛠️ Scripts PowerShell Disponíveis

### Configuração
- `configurar-tudo-automatico.ps1` - Configura tudo automaticamente
- `atualizar-supabase-url.ps1` - Atualiza URL da Evolution API no Supabase
- `configurar-supabase-variaveis.ps1` - Configura variáveis do Supabase

### Deploy
- `criar-fly-config.ps1` - Deploy no Fly.io
- `deploy-railway-completo.ps1` - Deploy no Railway
- `fazer-deploy-railway-agora.ps1` - Deploy rápido Railway

### Migrations
- `executar-migration-manual-booking.ps1` - Aplica migration de booking manual
- `executar-sql-final.ps1` - Executa SQL final

### Diagnóstico
- `diagnosticar-whatsapp-completo.ps1` - Diagnostica problemas WhatsApp
- `diagnosticar-evolution-api.ps1` - Diagnostica Evolution API

---

## 📝 Comandos Úteis

### Desenvolvimento Local
```bash
npm install          # Instalar dependências
npm run dev          # Iniciar servidor de desenvolvimento (porta 8080)
npm run build        # Build para produção
npm run preview      # Preview do build
```

### Supabase CLI
```bash
npx supabase login                    # Login no Supabase
npx supabase link --project-ref wabefmgfsatlusevxyfo  # Linkar projeto
npx supabase db push                  # Aplicar migrations
npx supabase secrets set KEY=value    # Configurar secrets
npx supabase functions deploy         # Deploy de functions
```

### Git
```bash
git status                           # Ver status
git add .                            # Adicionar todos os arquivos
git commit -m "mensagem"            # Commit
git push origin main                 # Push para GitHub
```

---

## 🎨 Componentes Principais

### Frontend
- **Navbar** - Barra de navegação com menu social/WiFi
- **Booking** - Fluxo de agendamento
- **AdminSidebar** - Menu lateral do admin
- **UserManager** - Gerenciamento de usuários
- **FilaDaBarbearia** - Fila de atendimento
- **BarbeiroDashboard** - Painel do barbeiro
- **ClienteDashboard** - Painel do cliente

### Backend (Supabase Functions)
- **api/index.ts** - API principal (Deno)
- **whatsapp-*** - Funções WhatsApp

---

## 🔐 Autenticação e Roles

**Roles disponíveis:**
- `admin` - Acesso total
- `gestor` - Gestão (pode editar barbeiros, ver financeiro)
- `barbeiro` - Barbeiro (pode criar agendamentos manuais)
- `cliente` - Cliente (pode agendar)

**Tabela:** `user_roles`
**Função helper:** `has_role(user_id, role)`

---

## 📊 Funcionalidades Implementadas

### ✅ Agendamentos
- Agendamento online
- Agendamento local (fila)
- Agendamento retroativo/manual (barbeiros)
- Tipos: `local`, `online`, `api`, `manual`

### ✅ WhatsApp
- Notificações automáticas
- Lembretes de agendamento
- Fila de processamento
- Integração com Evolution API

### ✅ Painéis
- Admin/Gestor - Gerenciamento completo
- Barbeiro - Agendamentos, horários, financeiro
- Cliente - Meus agendamentos

### ✅ Configurações
- Site config (tema, hero, footer, redes sociais, WiFi)
- Horários de funcionamento
- Comissões de barbeiros
- Produtos da loja

---

## 🚀 Deploy

### Frontend (Netlify/Vercel)
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Build command: `npm run build`
4. Publish directory: `dist`

### Evolution API (Fly.io)
```powershell
.\criar-fly-config.ps1
```

### Supabase Functions
```bash
npx supabase functions deploy nome-da-funcao
```

---

## 🐛 Troubleshooting

### Erro de conexão Supabase
- Verificar variáveis de ambiente
- Verificar se projeto está ativo no dashboard

### Erro de RLS
- Verificar políticas em `supabase/migrations/`
- Aplicar migrations pendentes

### Erro WhatsApp
- Verificar Evolution API está online
- Verificar secrets no Supabase
- Ver logs: `fly logs --app evolution-api-barbearia`

---

## 📋 Checklist para Novas Funcionalidades

1. ✅ Criar migration SQL (se necessário)
2. ✅ Atualizar tipos TypeScript (`supabase/types.ts`)
3. ✅ Criar/atualizar componentes React
4. ✅ Adicionar RLS policies (se necessário)
5. ✅ Testar localmente
6. ✅ Commit e push para GitHub
7. ✅ Aplicar migrations no Supabase
8. ✅ Deploy (se necessário)

---

## 🔗 Links Importantes

- **Supabase Dashboard:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo
- **GitHub:** https://github.com/godfordbabyfish-hash/Barbearia
- **Evolution API:** https://evolution-api-barbearia.fly.dev
- **SQL Editor:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/sql/new

---

## 💡 Dicas Importantes

1. **Sempre verificar RLS** ao criar novas tabelas
2. **Usar migrations** para mudanças no banco
3. **Testar localmente** antes de fazer deploy
4. **Commits descritivos** facilitam rastreamento
5. **Backup antes** de migrations grandes
6. **Verificar logs** em caso de erro

---

**Última atualização:** 2026-01-24
**Versão do projeto:** Em desenvolvimento ativo
