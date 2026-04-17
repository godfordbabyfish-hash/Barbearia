# 🚀 Deploy na Netlify - Passo a Passo

## 📋 Checklist Antes do Deploy

- [x] Projeto no GitHub
- [x] Projeto Supabase configurado
- [x] Arquivo `netlify.toml` criado
- [x] Arquivo `_redirects` configurado
- [ ] Migrations aplicadas no Supabase (verificar)
- [ ] Conta na Netlify

---

## 🎯 Passo a Passo - Deploy na Netlify

### 1. Criar Conta na Netlify

1. Acesse: https://www.netlify.com
2. Clique em **"Sign up"**
3. Escolha **"Sign up with GitHub"** (recomendado para integração automática)
4. Autorize a Netlify a acessar seus repositórios

### 2. Importar o Projeto

1. No dashboard da Netlify, clique em **"Add new site"** → **"Import an existing project"**
2. Selecione **"Deploy with GitHub"**
3. Autorize a Netlify se necessário
4. Encontre e selecione o repositório **"Barbearia"**
5. Clique em **"Import"**

### 3. Configurar Build Settings

A Netlify deve detectar automaticamente as configurações do `netlify.toml`, mas verifique:

**Build command:**
```
npm run build
```

**Publish directory:**
```
dist
```

**Node version:** (opcional, mas recomendado)
```
18
```

### 4. ⚠️ IMPORTANTE: Configurar Variáveis de Ambiente

**ANTES de fazer o deploy**, configure as variáveis de ambiente:

1. Na tela de configuração do site, role até **"Environment variables"**
2. Clique em **"Add a variable"**
3. Adicione cada uma dessas variáveis:

```
VITE_SUPABASE_URL = https://wabefmgfsatlusevxyfo.supabase.co
```

```
VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYmVmbWdmc2F0bHVzZXZ4eWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDgzMjYsImV4cCI6MjA4NDA4NDMyNn0.QJM-evofOHygDLm08gZpRPfOA9MnweBR67bNnNH5Bnc
```

```
VITE_SUPABASE_PROJECT_ID = wabefmgfsatlusevxyfo
```

4. Clique em **"Save"** após adicionar cada variável

### 5. Fazer o Deploy

1. Após configurar tudo, clique em **"Deploy site"**
2. Aguarde o build completar (pode levar 2-5 minutos)
3. Quando concluir, você verá uma URL temporária como: `https://random-name-12345.netlify.app`

### 6. Configurar URL no Supabase

⚠️ **CRÍTICO:** Após o deploy, configure a URL no Supabase:

1. Copie a URL do seu site Netlify (ex: `https://barbearia-xyz.netlify.app`)
2. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/auth/url-configuration
3. Em **"Site URL"**, adicione a URL do Netlify
4. Em **"Redirect URLs"**, adicione:
   - `https://seu-site.netlify.app/*`
   - `https://seu-site.netlify.app`
5. Clique em **"Save"**

---

## 🌐 Configurar Domínio Personalizado (Opcional)

### Usar o domínio padrão da Netlify:
- Você já receberá um domínio gratuito como: `barbearia-xyz.netlify.app`
- Funciona perfeitamente!

### Adicionar domínio personalizado:
1. No dashboard do site Netlify, vá em **"Domain settings"**
2. Clique em **"Add custom domain"**
3. Digite seu domínio (ex: `barbearia.com`)
4. Siga as instruções para configurar o DNS
5. ⚠️ **Atualize a URL no Supabase** após configurar o domínio

---

## 🔄 Deploy Automático

✅ **Já configurado!** Sempre que você fizer `git push` para o GitHub:
- A Netlify detecta automaticamente
- Faz um novo build
- Faz deploy da nova versão
- **Tudo automático!** 🎉

---

## 🧪 Testar Após Deploy

1. **Acesse a URL do seu site**
2. **Teste autenticação:**
   - Criar conta
   - Fazer login
   - Fazer logout

3. **Verifique console do navegador (F12):**
   - Não deve haver erros de conexão com Supabase
   - Não deve haver erros de CORS

4. **Teste funcionalidades:**
   - Dashboard
   - Agendamentos
   - Fila da barbearia

---

## ❓ Problemas Comuns

### Erro: "Supabase URL not found"
**Solução:**
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se os nomes estão corretos (com `VITE_` no início)
- Faça um novo deploy após adicionar variáveis

### Erro de autenticação não funciona
**Solução:**
- Verifique se a URL do Netlify está em "Redirect URLs" no Supabase
- Verifique se está usando HTTPS (a Netlify fornece automaticamente)

### Erro 404 em rotas (página não encontrada)
**Solução:**
- O arquivo `_redirects` e `netlify.toml` já estão configurados
- Se ainda tiver problemas, verifique se o arquivo está na pasta `public/`

### Build falha
**Solução:**
- Verifique os logs de build na Netlify
- Certifique-se de que `package.json` está correto
- Verifique se todas as dependências estão instaladas

---

## 📝 Comandos Úteis

### Testar build localmente antes de deploy:
```bash
npm run build
npm run preview
```

### Verificar se build está funcionando:
```bash
npm install
npm run build
# Verifique se a pasta dist foi criada
```

---

## ✅ Checklist Final

- [ ] Migrations aplicadas no Supabase
- [ ] Conta Netlify criada
- [ ] Repositório conectado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado
- [ ] URL configurada no Supabase
- [ ] Testes realizados
- [ ] Tudo funcionando! 🎉

---

## 🎉 Pronto!

Seu site estará online e funcionando! A cada push no GitHub, um novo deploy será feito automaticamente.

**Próximos passos:**
1. Configure o domínio personalizado (se quiser)
2. Configure notificações de deploy (opcional)
3. Configure analytics (opcional)

---

## 📞 Precisa de Ajuda?

- Documentação Netlify: https://docs.netlify.com
- Suporte Netlify: https://www.netlify.com/support/
