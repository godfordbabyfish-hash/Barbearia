# 🔧 Configurar Variáveis de Ambiente no Netlify - PASSO A PASSO

## ⚠️ IMPORTANTE: A página não abre porque faltam as variáveis de ambiente!

Siga estes passos EXATOS:

---

## 📝 PASSO A PASSO - Passo 1: Abrir Environment Variables

1. No dashboard do Netlify, você já está na página certa! 
2. Clique no botão **"Add a variable"** (botão verde no canto superior direito)

---

## 📝 PASSO A PASSO - Passo 2: Adicionar Primeira Variável

### Variável 1: VITE_SUPABASE_URL

1. Depois de clicar em "Add a variable", você verá dois campos:
   - **Key** (chave)
   - **Value** (valor)

2. No campo **Key**, digite EXATAMENTE:
   ```
   VITE_SUPABASE_URL
   ```
   (maiúsculas, com underscore)

3. No campo **Value**, cole EXATAMENTE:
   ```
   https://wabefmgfsatlusevxyfo.supabase.co
   ```

4. Clique em **"Save"** ou **"Add variable"**

---

## 📝 PASSO A PASSO - Passo 3: Adicionar Segunda Variável

### Variável 2: VITE_SUPABASE_PUBLISHABLE_KEY

1. Clique novamente em **"Add a variable"**

2. No campo **Key**, digite:
   ```
   VITE_SUPABASE_PUBLISHABLE_KEY
   ```

3. No campo **Value**, cole esta chave COMPLETA (é muito longa, certifique-se de copiar tudo):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
   ```

4. Clique em **"Save"**

---

## 📝 PASSO A PASSO - Passo 4: Adicionar Terceira Variável

### Variável 3: VITE_SUPABASE_PROJECT_ID

1. Clique novamente em **"Add a variable"**

2. No campo **Key**, digite:
   ```
   VITE_SUPABASE_PROJECT_ID
   ```

3. No campo **Value**, digite:
   ```
   wabefmgfsatlusevxyfo
   ```

4. Clique em **"Save"**

---

## ✅ Verificação Final

Depois de adicionar as 3 variáveis, você deve ver uma lista com:

```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_PUBLISHABLE_KEY  
✅ VITE_SUPABASE_PROJECT_ID
```

---

## 🔄 Passo 5: Fazer Novo Deploy

**MUITO IMPORTANTE:** Após adicionar as variáveis, você PRECISA fazer um novo deploy!

### Opção 1: Deploy Automático (Recomendado)
1. Vá para **"Deploys"** no menu lateral
2. Clique nos **3 pontinhos** (⋮) ao lado de "Trigger deploy"
3. Selecione **"Clear cache and deploy site"**
4. Aguarde o build completar (2-5 minutos)

### Opção 2: Push para GitHub
Se você fizer um `git push` para o GitHub, o Netlify fará deploy automático.

---

## 🎯 Resumo Rápido

Você precisa adicionar estas 3 variáveis:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://wabefmgfsatlusevxyfo.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc` |
| `VITE_SUPABASE_PROJECT_ID` | `wabefmgfsatlusevxyfo` |

---

## ⚠️ IMPORTANTE - Atenção aos Detalhes

1. **Nomes EXATOS:** Os nomes devem ser EXATAMENTE como mostrado (maiúsculas, underscore)
2. **Sem espaços:** Não deixe espaços antes ou depois dos valores
3. **Copiar completo:** A chave PUBLISHABLE_KEY é muito longa, copie tudo
4. **Novo deploy:** SEMPRE faça um novo deploy após adicionar variáveis

---

## ✅ Depois do Deploy

Quando o deploy terminar:

1. Acesse a URL do seu site
2. A página deve carregar normalmente
3. Se ainda houver problema, verifique o console (F12) e me avise

---

## 🆘 Ainda com Problemas?

Se após adicionar as variáveis e fazer o deploy ainda não funcionar:

1. Verifique se os nomes estão EXATOS (case-sensitive)
2. Verifique se não há espaços extras
3. Faça um "Clear cache and deploy" novamente
4. Aguarde alguns minutos (as variáveis podem levar alguns segundos para propagar)
