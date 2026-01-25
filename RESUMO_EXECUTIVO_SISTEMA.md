# ⚡ Resumo Executivo - Sistema Barbearia

## 🎯 Stack Principal

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn-ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **WhatsApp:** Railway (Bot Baileys/Evolution API)
- **Hospedagem Frontend:** Netlify
- **Versionamento:** GitHub

---

## 🌐 Plataformas (Todas Gratuitas)

| Plataforma | Uso | URL |
|------------|-----|-----|
| **Supabase** | Backend/DB | https://supabase.com |
| **Netlify** | Frontend | https://netlify.com |
| **Railway** | WhatsApp Bot | https://railway.app |
| **GitHub** | Código | https://github.com |

---

## 🔑 Variáveis de Ambiente Essenciais

### Frontend (Netlify)
```env
VITE_SUPABASE_URL=https://{project_id}.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY={key}
VITE_SUPABASE_PROJECT_ID={project_id}
```

### Supabase Functions
```env
EVOLUTION_API_URL=https://{bot}.up.railway.app
EVOLUTION_API_KEY=testdaapi2026
EVOLUTION_INSTANCE_NAME=default
```

---

## 📦 Estrutura Principal

```
Frontend (Netlify)
    ↓
Supabase (Backend)
    ├── PostgreSQL (DB)
    ├── Auth
    ├── Storage
    └── Edge Functions
    ↓
WhatsApp Bot (Railway)
```

---

## 🗄️ Tabelas Principais

1. `profiles` - Usuários
2. `user_roles` - Permissões (admin, gestor, barbeiro, cliente)
3. `barbers` - Barbeiros
4. `services` - Serviços
5. `appointments` - Agendamentos
6. `products` - Produtos
7. `site_config` - Configurações
8. `whatsapp_notifications_queue` - Fila WhatsApp

---

## 🚀 Deploy Rápido

### 1. Supabase
```bash
npx supabase link --project-ref {id}
npx supabase db push
npx supabase functions deploy nome
```

### 2. Netlify
- Conectar GitHub
- Build: `npm run build`
- Dir: `dist`
- Variáveis de ambiente

### 3. Railway
- Deploy from GitHub
- Repositório do bot
- Variáveis: `PORT=3000`

---

## 📱 WhatsApp

1. Deploy bot no Railway
2. Configurar `EVOLUTION_API_URL` no Supabase
3. Conectar via QR Code no painel admin
4. Ativar instância

---

## 💰 Custo Total

**$0/mês** (tudo no plano free)

---

## 📖 Documentação Completa

Veja `RESUMO_COMPLETO_SISTEMA.md` para detalhes completos.

---

**Status:** ✅ Produção  
**Última atualização:** Janeiro 2026
