<<<<<<< HEAD
# 🚀 Deploy Agora - Passo a Passo Rápido

## ✅ Código Pronto!

O código já está preparado e commitado localmente.

## 📋 Execute Estes Comandos (2 minutos)

### 1. Criar Repositório no GitHub

Acesse: https://github.com/new
- Nome: `whatsapp-bot-barbearia`
- Private ou Public (sua escolha)
- **NÃO marque** "Add a README file"
- Clique em "Create repository"

### 2. Conectar e Fazer Push

**Substitua `SEU_USUARIO` pelo seu usuário do GitHub!**

```powershell
cd c:\Users\thiag\Downloads\Barbearia\whatsapp-bot-railway
git remote add origin https://github.com/SEU_USUARIO/whatsapp-bot-barbearia.git
git branch -M main
git push -u origin main
```

### 3. Deploy no Railway

1. Acesse: https://railway.app
2. Login com GitHub
3. New Project > Deploy from GitHub repo
4. Selecione: `whatsapp-bot-barbearia`
5. Railway faz deploy automaticamente
6. Configure variável: `API_KEY` = `testdaapi2026`
7. Anote a URL gerada

### 4. Atualizar Supabase

```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
```

**Substitua pela URL real do Railway!**

## ✅ Pronto!

Após isso, tudo estará funcionando 100%!
=======
# 🚀 Deploy Agora - Passo a Passo Rápido

## ✅ Código Pronto!

O código já está preparado e commitado localmente.

## 📋 Execute Estes Comandos (2 minutos)

### 1. Criar Repositório no GitHub

Acesse: https://github.com/new
- Nome: `whatsapp-bot-barbearia`
- Private ou Public (sua escolha)
- **NÃO marque** "Add a README file"
- Clique em "Create repository"

### 2. Conectar e Fazer Push

**Substitua `SEU_USUARIO` pelo seu usuário do GitHub!**

```powershell
cd c:\Users\thiag\Downloads\Barbearia\whatsapp-bot-railway
git remote add origin https://github.com/SEU_USUARIO/whatsapp-bot-barbearia.git
git branch -M main
git push -u origin main
```

### 3. Deploy no Railway

1. Acesse: https://railway.app
2. Login com GitHub
3. New Project > Deploy from GitHub repo
4. Selecione: `whatsapp-bot-barbearia`
5. Railway faz deploy automaticamente
6. Configure variável: `API_KEY` = `testdaapi2026`
7. Anote a URL gerada

### 4. Atualizar Supabase

```powershell
npx supabase secrets set EVOLUTION_API_URL=https://whatsapp-bot-xxxx.up.railway.app
```

**Substitua pela URL real do Railway!**

## ✅ Pronto!

Após isso, tudo estará funcionando 100%!
>>>>>>> 6d587b87b13971962a4acbafd785c2a7ec076ba8
