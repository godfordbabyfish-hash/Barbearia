# 🚀 Configurar Vercel - Guia Rápido

## ✅ Checklist de Configuração

### 1. **Importar Projeto no Vercel**

1. Acesse: https://vercel.com
2. Faça login com sua conta **GitHub**
3. Clique em **"Add New"** → **"Project"**
4. Selecione o repositório **"Barbearia"**
5. Clique em **"Import"**

### 2. **Configurações Automáticas**

O Vercel deve detectar automaticamente:
- ✅ **Framework**: Vite
- ✅ **Build Command**: `npm run build`
- ✅ **Output Directory**: `dist`
- ✅ **Install Command**: `npm ci`

**Se não detectar**, configure manualmente:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Root Directory**: `./` (raiz do projeto)

### 3. ⚠️ **IMPORTANTE: Variáveis de Ambiente**

**ANTES de fazer o deploy**, configure as variáveis:

1. Na tela de configuração, role até **"Environment Variables"**
2. Clique em **"Add"** para cada variável:

#### Variável 1:
```
Name: VITE_SUPABASE_URL
Value: https://wabefmgfsatlusevxyfo.supabase.co
Environment: Production, Preview, Development (marque todas)
```

#### Variável 2:
```
Name: VITE_SUPABASE_PUBLISHABLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
Environment: Production, Preview, Development (marque todas)
```

#### Variável 3 (Opcional):
```
Name: VITE_SUPABASE_PROJECT_ID
Value: wabefmgfsatlusevxyfo
Environment: Production, Preview, Development (marque todas)
```

### 4. **Fazer Deploy**

1. Após configurar tudo, clique em **"Deploy"**
2. Aguarde o build completar (1-3 minutos)
3. Quando concluir, você verá uma URL como: `https://barbearia-xxxxx.vercel.app`

### 5. **Configurar Domínio Customizado (Opcional)**

Se você tiver um domínio:

1. Vá em **Settings** → **Domains**
2. Clique em **"Add"**
3. Digite seu domínio (ex: `barbearia.com`)
4. Siga as instruções para configurar DNS

### 6. **Configurar Supabase para Aceitar o Domínio**

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/url-configuration
2. Adicione a URL do Vercel em:
   - **Site URL**: `https://seu-projeto.vercel.app`
   - **Redirect URLs**: `https://seu-projeto.vercel.app/**`

---

## 📋 Resumo das Variáveis

Copie e cole estas variáveis no Vercel:

```env
VITE_SUPABASE_URL=https://wabefmgfsatlusevxyfo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
VITE_SUPABASE_PROJECT_ID=wabefmgfsatlusevxyfo
```

---

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

1. **Site carrega?** → Acesse a URL do Vercel
2. **Login funciona?** → Teste login
3. **Dados aparecem?** → Verifique se os dados do Supabase carregam

Se algo não funcionar:
- Verifique os **logs do build** no Vercel
- Verifique se as **variáveis de ambiente** estão configuradas
- Verifique se o **Supabase** aceita a URL do Vercel

---

## 🎉 Pronto!

Seu projeto está no Vercel! 🚀

**Próximos passos:**
- Cada push no GitHub fará deploy automático
- Preview deploys para cada PR
- Analytics disponível no dashboard

---

**Dúvidas?** Verifique os logs do build no Vercel Dashboard!
