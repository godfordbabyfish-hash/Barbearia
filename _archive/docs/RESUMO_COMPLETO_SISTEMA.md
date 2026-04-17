# 📋 Resumo Completo do Sistema - Barbearia

## 🎯 Visão Geral

**Nome do Projeto:** Sistema de Gestão de Barbearia  
**Tipo:** Aplicação Web Full-Stack  
**Stack Principal:** React + TypeScript + Vite + Supabase + Tailwind CSS + shadcn-ui  
**Repositório GitHub:** `https://github.com/godfordbabyfish-hash/Barbearia.git`

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐
│   Frontend      │  React + Vite + TypeScript
│   (Netlify)     │  Tailwind CSS + shadcn-ui
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Supabase      │  Backend as a Service
│   - PostgreSQL  │  - Banco de dados
│   - Auth        │  - Autenticação
│   - Storage     │  - Armazenamento
│   - Functions   │  - Edge Functions (Deno)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WhatsApp Bot   │  Evolution API / Baileys
│  (Railway)       │  - Envio de mensagens
└─────────────────┘
```

---

## 🌐 Plataformas e Serviços Utilizados

### 1. **Supabase** (Backend Principal)
- **Tipo:** Backend as a Service (BaaS)
- **URL Dashboard:** `https://supabase.com/dashboard`
- **Project ID:** `wabefmgfsatlusevxyfo`
- **URL Base:** `https://wabefmgfsatlusevxyfo.supabase.co`
- **Serviços usados:**
  - ✅ PostgreSQL (Banco de dados)
  - ✅ Authentication (Auth)
  - ✅ Storage (Imagens)
  - ✅ Edge Functions (Deno)
  - ✅ Realtime (Subscriptions)
  - ✅ Row Level Security (RLS)

**Custo:** Plano Free (até 500MB de banco, 2GB de storage)

**Configuração:**
```bash
# Linkar projeto
npx supabase link --project-ref wabefmgfsatlusevxyfo

# Deploy functions
npx supabase functions deploy nome-da-funcao
```

---

### 2. **Netlify** (Hospedagem Frontend)
- **Tipo:** Plataforma de hospedagem estática
- **URL:** `https://app.netlify.com`
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Framework:** Vite

**Custo:** Plano Free (100GB bandwidth/mês)

**Configuração:**
- Conectar repositório GitHub
- Build command: `npm run build`
- Publish directory: `dist`
- Variáveis de ambiente configuradas no painel

---

### 3. **Railway** (WhatsApp Bot)
- **Tipo:** Plataforma de deploy de aplicações
- **URL:** `https://railway.app`
- **Repositório Bot:** `https://github.com/godfordbabyfish-hash/whatsapp-bot-barbearia`
- **URL Produção:** `https://whatsapp-bot-barbearia-production.up.railway.app`
- **Tecnologia:** Node.js + Baileys (WhatsApp Web API)

**Custo:** $5 crédito grátis/mês (suficiente para uso moderado)

**Configuração:**
- Deploy automático via GitHub
- Variáveis de ambiente no painel Railway
- Health check: `/health`

---

### 4. **GitHub** (Controle de Versão)
- **Tipo:** Repositório Git
- **URL:** `https://github.com`
- **Repositório Principal:** `godfordbabyfish-hash/Barbearia`
- **Repositório Bot:** `godfordbabyfish-hash/whatsapp-bot-barbearia`
- **Branch Principal:** `main`

**Custo:** Gratuito (repositórios públicos)

---

## 🔧 Tecnologias e Dependências

### Frontend
```json
{
  "framework": "React 18.3.1",
  "buildTool": "Vite 5.4.19",
  "language": "TypeScript 5.8.3",
  "styling": "Tailwind CSS 3.4.17",
  "uiComponents": "shadcn-ui (Radix UI)",
  "routing": "React Router DOM 6.30.1",
  "stateManagement": "TanStack Query 5.83.0",
  "forms": "React Hook Form 7.61.1",
  "validation": "Zod 3.25.76",
  "notifications": "Sonner 1.7.4",
  "charts": "Recharts 2.15.4",
  "dateHandling": "date-fns 3.6.0"
}
```

### Backend (Supabase)
- **Runtime:** Deno (Edge Functions)
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth (JWT)
- **Storage:** Supabase Storage

### WhatsApp Bot (Railway)
- **Runtime:** Node.js
- **Library:** Baileys (WhatsApp Web API)
- **Framework:** Express.js
- **Database:** Nenhum (stateless)

---

## 📦 Variáveis de Ambiente

### Frontend (Netlify)
```env
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
```

### Supabase Edge Functions (Secrets)
```env
# Supabase (automático)
SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WhatsApp Bot
EVOLUTION_API_URL=https://whatsapp-bot-barbearia-production.up.railway.app
EVOLUTION_API_KEY=testdaapi2026
EVOLUTION_INSTANCE_NAME=default
```

**Como configurar:**
```bash
npx supabase secrets set EVOLUTION_API_URL=https://seu-bot.up.railway.app
npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
npx supabase secrets set EVOLUTION_INSTANCE_NAME=default
```

### WhatsApp Bot (Railway)
```env
PORT=3000
NODE_ENV=production
```

---

## 🗄️ Estrutura do Banco de Dados (Supabase PostgreSQL)

### Tabelas Principais

1. **profiles**
   - Perfis de usuários (nome, telefone, foto)
   - Relacionado com `auth.users`

2. **user_roles**
   - Roles: `admin`, `gestor`, `barbeiro`, `cliente`
   - Função helper: `has_role(user_id, role)`

3. **barbers**
   - Informações dos barbeiros
   - WhatsApp, foto, experiência, horários

4. **services**
   - Serviços oferecidos (corte, barba, etc.)
   - Preço, duração, imagem

5. **appointments**
   - Agendamentos
   - Tipos: `local`, `online`, `api`, `manual`
   - Status: `pending`, `confirmed`, `cancelled`, `completed`

6. **products**
   - Produtos da loja
   - Preço, comissão, visibilidade

7. **site_config**
   - Configurações do site (JSONB)
   - Tema, hero, footer, redes sociais, WiFi
   - WhatsApp active instance

8. **whatsapp_notifications_queue**
   - Fila de mensagens WhatsApp
   - Status: `pending`, `sent`, `failed`

9. **barber_commissions**
   - Comissões dos barbeiros
   - Serviços e produtos (percentual fixo)

10. **barber_breaks**
    - Intervalos dos barbeiros
    - Horários de pausa

11. **barber_availability**
    - Disponibilidade dos barbeiros
    - Horários disponíveis por dia

### Migrations Importantes

- `20260124000000_add_manual_booking_type.sql` - Tipo manual para agendamentos
- `20260124000001_allow_barbers_create_profiles.sql` - Barbeiros criam perfis
- `20260124000003_add_barber_product_commissions.sql` - Comissões de produtos
- `20260120000001_setup_reminder_cron.sql` - Cron job de lembretes

**Aplicar migrations:**
```bash
# Via CLI
npx supabase db push

# Via Dashboard
# Acesse: https://supabase.com/dashboard/project/{project_id}/sql/new
# Cole o SQL e execute
```

---

## 🔌 Edge Functions (Supabase)

### Funções Principais

1. **api/index.ts**
   - API principal
   - Endpoints diversos
   - `verify_jwt = false`

2. **whatsapp-manager/index.ts**
   - Gerencia instâncias WhatsApp
   - Criar, listar, conectar, desconectar
   - Obter QR Code

3. **whatsapp-notify/index.ts**
   - Envia notificações WhatsApp
   - Processa fila de mensagens
   - Formata mensagens

4. **whatsapp-process-queue/index.ts**
   - Processa fila de notificações
   - Chama whatsapp-notify

5. **whatsapp-reminder/index.ts**
   - Envia lembretes 10 minutos antes
   - Chamado via cron job PostgreSQL

6. **cleanup-whatsapp-queue/index.ts**
   - Limpa fila antiga
   - Remove mensagens processadas

7. **setup-reminder-cron/index.ts**
   - Configura cron job de lembretes
   - Executa uma vez

8. **apply-migration/index.ts**
   - Aplica migrations via API
   - Utilitário administrativo

**Deploy:**
```bash
npx supabase functions deploy nome-da-funcao
```

---

## 📱 Integração WhatsApp

### Arquitetura

```
Agendamento Criado
    ↓
Trigger PostgreSQL → whatsapp_notifications_queue
    ↓
Cron Job (1 min) → whatsapp-process-queue
    ↓
whatsapp-notify → Evolution API (Railway)
    ↓
WhatsApp
```

### Configuração

1. **Criar bot no Railway:**
   - Repositório: `whatsapp-bot-barbearia`
   - Deploy automático via GitHub
   - URL: `https://whatsapp-bot-xxxx.up.railway.app`

2. **Configurar no Supabase:**
   ```bash
   npx supabase secrets set EVOLUTION_API_URL=https://seu-bot.up.railway.app
   npx supabase secrets set EVOLUTION_API_KEY=testdaapi2026
   ```

3. **Conectar WhatsApp:**
   - Acesse painel admin → WhatsApp
   - Clique em "Conectar"
   - Escaneie QR Code
   - Ative a instância

### Funcionalidades

- ✅ Notificação quando agendamento é criado
- ✅ Notificação quando agendamento é atualizado
- ✅ Notificação quando agendamento é cancelado
- ✅ Lembrete automático 10 minutos antes
- ✅ Notificações para cliente e barbeiro
- ✅ Fila de processamento (retry automático)

---

## 🎨 Estrutura do Projeto

```
Barbearia/
├── src/
│   ├── components/          # Componentes React
│   │   ├── admin/          # Painel admin
│   │   ├── ui/             # shadcn-ui
│   │   └── ...
│   ├── pages/              # Páginas principais
│   │   ├── AdminDashboard.tsx
│   │   ├── BarbeiroDashboard.tsx
│   │   ├── ClienteDashboard.tsx
│   │   └── FilaDaBarbearia.tsx
│   ├── hooks/              # Custom hooks
│   ├── contexts/           # Contextos React
│   ├── integrations/       # Integrações
│   │   └── supabase/      # Cliente Supabase
│   ├── config/             # Configurações
│   │   └── whatsapp.ts    # Config WhatsApp
│   └── utils/              # Utilitários
│
├── supabase/
│   ├── migrations/         # Migrations SQL
│   ├── functions/          # Edge Functions
│   │   ├── api/
│   │   ├── whatsapp-*/
│   │   └── ...
│   └── config.toml         # Config Supabase
│
├── public/                 # Arquivos estáticos
├── scripts/               # Scripts utilitários
├── package.json           # Dependências
├── vite.config.ts        # Config Vite
├── tailwind.config.ts    # Config Tailwind
└── vercel.json           # Config Netlify/Vercel
```

---

## 🚀 Processo de Deploy

### 1. Frontend (Netlify)

1. **Conectar GitHub:**
   - Acesse Netlify
   - "Add new site" → "Import from Git"
   - Selecione repositório

2. **Configurar Build:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Framework: Vite

3. **Variáveis de Ambiente:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

4. **Deploy:**
   - Automático a cada push em `main`

### 2. Backend (Supabase)

1. **Aplicar Migrations:**
   ```bash
   npx supabase db push
   ```

2. **Deploy Functions:**
   ```bash
   npx supabase functions deploy nome-da-funcao
   ```

3. **Configurar Secrets:**
   ```bash
   npx supabase secrets set KEY=value
   ```

### 3. WhatsApp Bot (Railway)

1. **Criar Projeto:**
   - Acesse Railway
   - "New Project" → "Deploy from GitHub"
   - Selecione repositório `whatsapp-bot-barbearia`

2. **Configurar:**
   - Build command: (automático)
   - Start command: `npm start`
   - Port: `3000`

3. **Variáveis:**
   - `PORT=3000`
   - `NODE_ENV=production`

4. **Deploy:**
   - Automático a cada push

---

## 🔐 Autenticação e Roles

### Roles Disponíveis

- **admin** - Acesso total ao sistema
- **gestor** - Gestão (editar barbeiros, ver financeiro)
- **barbeiro** - Criar agendamentos manuais, ver seus agendamentos
- **cliente** - Agendar serviços, ver seus agendamentos

### Sistema de Permissões

- **RLS (Row Level Security)** - Políticas no banco
- **Função helper:** `has_role(user_id, role)`
- **Tabela:** `user_roles`

---

## 📊 Funcionalidades Principais

### ✅ Agendamentos
- Agendamento online (cliente)
- Agendamento local (fila)
- Agendamento manual/retroativo (barbeiro)
- Tipos: `local`, `online`, `api`, `manual`

### ✅ WhatsApp
- Notificações automáticas
- Lembretes 10 minutos antes
- Fila de processamento
- Retry automático

### ✅ Painéis
- **Admin/Gestor:** Gerenciamento completo
- **Barbeiro:** Agendamentos, horários, financeiro
- **Cliente:** Meus agendamentos

### ✅ Configurações
- Site config (tema, hero, footer)
- Redes sociais, WiFi
- Horários de funcionamento
- Comissões de barbeiros
- Produtos da loja

### ✅ Financeiro
- Comissões por serviço
- Comissões por produto
- Dashboard financeiro
- Relatórios

---

## 🛠️ Comandos Úteis

### Desenvolvimento Local
```bash
npm install          # Instalar dependências
npm run dev          # Servidor dev (porta 8080)
npm run build        # Build produção
npm run preview      # Preview build
```

### Supabase CLI
```bash
npx supabase login                    # Login
npx supabase link --project-ref ID    # Linkar projeto
npx supabase db push                  # Aplicar migrations
npx supabase functions deploy nome    # Deploy function
npx supabase secrets set KEY=value    # Configurar secret
```

### Git
```bash
git status                    # Status
git add .                     # Adicionar arquivos
git commit -m "mensagem"      # Commit
git push origin main          # Push
```

---

## 📝 Checklist para Recriar o Sistema

### 1. Criar Contas
- [ ] Conta Supabase (https://supabase.com)
- [ ] Conta Netlify (https://netlify.com)
- [ ] Conta Railway (https://railway.app)
- [ ] Conta GitHub (https://github.com)

### 2. Configurar Supabase
- [ ] Criar novo projeto
- [ ] Anotar Project ID e URLs
- [ ] Configurar Auth (URLs permitidas)
- [ ] Aplicar todas as migrations
- [ ] Configurar RLS policies

### 3. Configurar Frontend
- [ ] Criar repositório GitHub
- [ ] Fazer push do código
- [ ] Conectar no Netlify
- [ ] Configurar variáveis de ambiente
- [ ] Deploy

### 4. Configurar WhatsApp Bot
- [ ] Criar repositório do bot
- [ ] Fazer push do código
- [ ] Deploy no Railway
- [ ] Anotar URL do bot
- [ ] Configurar secrets no Supabase

### 5. Configurar Integrações
- [ ] Configurar `EVOLUTION_API_URL` no Supabase
- [ ] Configurar `EVOLUTION_API_KEY` no Supabase
- [ ] Conectar WhatsApp via QR Code
- [ ] Testar envio de mensagens

### 6. Testes
- [ ] Criar usuário admin
- [ ] Testar agendamento
- [ ] Testar notificação WhatsApp
- [ ] Testar lembrete
- [ ] Verificar painéis

---

## 🔗 Links Importantes

### Dashboards
- **Supabase:** `https://supabase.com/dashboard/project/{project_id}`
- **Netlify:** `https://app.netlify.com`
- **Railway:** `https://railway.app`
- **GitHub:** `https://github.com/{usuario}/{repositorio}`

### Documentação
- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev
- **Vite Docs:** https://vitejs.dev
- **Tailwind Docs:** https://tailwindcss.com
- **shadcn/ui:** https://ui.shadcn.com

---

## 💰 Custos Estimados

| Serviço | Plano | Custo Mensal |
|---------|-------|--------------|
| **Supabase** | Free | $0 (até 500MB DB, 2GB storage) |
| **Netlify** | Free | $0 (100GB bandwidth) |
| **Railway** | Free | $0 ($5 crédito grátis) |
| **GitHub** | Free | $0 (repos públicos) |
| **TOTAL** | | **$0/mês** |

**Nota:** Para uso intenso, pode precisar de planos pagos:
- Supabase Pro: $25/mês
- Railway: Pay-as-you-go
- Netlify Pro: $19/mês

---

## 🎯 Próximos Passos ao Recriar

1. **Fork/Clone** o repositório
2. **Criar** novos projetos nas plataformas
3. **Atualizar** variáveis de ambiente
4. **Aplicar** migrations no novo Supabase
5. **Deploy** frontend e bot
6. **Configurar** WhatsApp
7. **Testar** todas as funcionalidades

---

## 📚 Arquivos de Referência

- `REFERENCIA_COMPLETA_PROJETO.md` - Referência detalhada
- `COMO_TROCAR_CONTA_WHATSAPP.md` - Guia WhatsApp
- `DEPLOY.md` - Guia de deploy
- `CONFIGURAR_WHATSAPP_RAILWAY.md` - Config WhatsApp

---

**Última atualização:** Janeiro 2026  
**Versão:** 1.0  
**Status:** Produção
