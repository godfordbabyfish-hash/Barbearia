# Guia de Deploy - Colocando o Projeto Online

## 📋 O Que Você Precisa Para Colocar o Projeto Online

### 1. ✅ Pré-requisitos Básicos

- [x] Projeto no GitHub (já feito)
- [x] Projeto Supabase configurado (já feito)
- [x] Migrations aplicadas no banco de dados (verificar)
- [ ] Conta em uma plataforma de hospedagem (Vercel, Netlify, etc.)

### 2. 🔧 Configurações Necessárias

#### A. Variáveis de Ambiente no Serviço de Hospedagem

Você precisará configurar estas variáveis no painel da plataforma de hospedagem:

```env
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
```

#### B. Configurações do Supabase

1. **Configurar URLs permitidas para autenticação:**
   - Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/url-configuration
   - Adicione a URL do seu site em produção em "Site URL" e "Redirect URLs"
   - Exemplo: `https://seu-dominio.com`

2. **Verificar RLS (Row Level Security):**
   - Certifique-se de que todas as políticas RLS estão configuradas corretamente
   - As migrations já devem ter configurado isso

---

## 🚀 Opções de Deploy

### Opção 1: Vercel (Recomendado - Mais Fácil)

#### Vantagens:
- ✅ Integração direta com GitHub
- ✅ Deploy automático a cada push
- ✅ HTTPS gratuito
- ✅ CDN global
- ✅ Configuração simples

#### Passos:

1. **Criar conta na Vercel:**
   - Acesse: https://vercel.com
   - Faça login com sua conta GitHub

2. **Importar projeto:**
   - Clique em "Add New" → "Project"
   - Selecione o repositório `Barbearia`
   - Clique em "Import"

3. **Configurar variáveis de ambiente:**
   - Na seção "Environment Variables", adicione:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
     - `VITE_SUPABASE_PROJECT_ID`

4. **Configurar Build Settings:**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Deploy:**
   - Clique em "Deploy"
   - Aguarde o build completar
   - Seu site estará online! 🎉

6. **Configurar URL no Supabase:**
   - Após o deploy, copie a URL da Vercel (ex: `https://barbearia.vercel.app`)
   - Adicione em: Supabase → Authentication → URL Configuration

---

### Opção 2: Netlify

#### Vantagens:
- ✅ Integração com GitHub
- ✅ Deploy automático
- ✅ HTTPS gratuito
- ✅ Arquivo `_redirects` já configurado no projeto

#### Passos:

1. **Criar conta na Netlify:**
   - Acesse: https://www.netlify.com
   - Faça login com GitHub

2. **Importar projeto:**
   - Clique em "Add new site" → "Import an existing project"
   - Selecione o repositório `Barbearia`

3. **Configurar build:**
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Configurar variáveis de ambiente:**
   - Site settings → Environment variables
   - Adicione as 3 variáveis do Supabase

5. **Deploy:**
   - Clique em "Deploy site"
   - Aguarde o build

6. **Configurar URL no Supabase** (igual à Vercel)

---

### Opção 3: Render

#### Passos:

1. Acesse: https://render.com
2. Crie uma conta e conecte ao GitHub
3. Selecione "New Static Site"
4. Conecte o repositório
5. Configure:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Adicione as variáveis de ambiente
6. Deploy!

---

### Opção 4: GitHub Pages (Gratuito, mas limitado)

⚠️ **Nota:** GitHub Pages pode ter limitações com SPAs. Requer configuração adicional.

---

## 🔒 Segurança - Checklist Pós-Deploy

1. ✅ Variáveis de ambiente configuradas (NUNCA commitar `.env`)
2. ✅ URL de produção adicionada no Supabase Auth
3. ✅ RLS (Row Level Security) ativo em todas as tabelas
4. ✅ HTTPS habilitado (automático na maioria das plataformas)
5. ✅ CORS configurado no Supabase (se necessário)

---

## 🧪 Testar Após Deploy

1. **Testar autenticação:**
   - Criar conta
   - Fazer login
   - Testar logout

2. **Testar funcionalidades principais:**
   - Agendamentos
   - Dashboard do admin/barbeiro/cliente
   - Fila da barbearia

3. **Verificar console do navegador:**
   - F12 → Console
   - Verificar se há erros de conexão

---

## 📝 Comandos Úteis

### Build local para testar:
```bash
npm run build
npm run preview
```

### Verificar build antes de deploy:
```bash
npm run build
# Verifica se a pasta dist foi criada corretamente
```

---

## ❓ Solução de Problemas Comuns

### Erro: "Supabase URL not found"
- Verifique se as variáveis de ambiente estão configuradas
- Reinicie o build após adicionar variáveis

### Erro de autenticação
- Verifique se a URL de produção está na lista de URLs permitidas no Supabase
- Verifique se está usando HTTPS

### Erro 404 em rotas
- Configure o `_redirects` (já existe no projeto)
- Na Vercel, crie `vercel.json` se necessário

---

## 🎯 Recomendação Final

**Para começar rapidamente:** Use **Vercel** - é a opção mais simples e rápida!

1. Conecte o GitHub
2. Configure as variáveis de ambiente
3. Deploy automático!

Seu projeto estará online em menos de 5 minutos! 🚀
