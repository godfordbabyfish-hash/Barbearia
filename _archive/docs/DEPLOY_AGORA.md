# 🚀 Deploy da Edge Function - Instruções Rápidas

## ✅ Arquivo Verificado

O arquivo `supabase\functions\whatsapp-manager\index.ts` existe e está pronto para deploy!

## 🎯 Método Mais Rápido

### Opção 1: Script Automático (Recomendado)

Execute este comando no PowerShell:

```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
.\deploy-edge-function.ps1
```

O script vai:
1. ✅ Verificar se o arquivo existe
2. ✅ Fazer login no Supabase (se necessário)
3. ✅ Linkar o projeto (se necessário)
4. ✅ Fazer o deploy

---

### Opção 2: Comandos Manuais

Se preferir fazer manualmente:

```powershell
# 1. Navegar para o projeto
cd "C:\Users\thiag\Downloads\Barbearia"

# 2. Fazer login (se ainda não fez)
npx supabase login

# 3. Linkar projeto (se ainda não linkou)
npx supabase link --project-ref wabefmgfsatlusevxyfo

# 4. Fazer deploy
npx supabase functions deploy whatsapp-manager
```

---

## ❌ Se Der Erro

### Erro: "Not logged in"

**Solução:**
```powershell
npx supabase login
```
Isso vai abrir o navegador para você fazer login.

---

### Erro: "Project not linked"

**Solução:**
```powershell
npx supabase link --project-ref wabefmgfsatlusevxyfo
```

**Se pedir senha/token:**
- Use sua senha do Supabase, ou
- Gere um token em: https://supabase.com/dashboard/account/tokens

---

### Erro: "Network error" ou "Connection timeout"

**Soluções:**
1. Verifique sua conexão com a internet
2. Desabilite proxy temporariamente:
   ```powershell
   $env:HTTP_PROXY = ""
   $env:HTTPS_PROXY = ""
   npx supabase functions deploy whatsapp-manager
   ```
3. Tente novamente após alguns segundos

---

### Erro: "Permission denied"

**Solução:**
Verifique se você tem acesso ao projeto no Supabase Dashboard:
- Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo
- Verifique se você é admin ou tem permissão para fazer deploy

---

## ✅ Verificar se Funcionou

### Método 1: Dashboard

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager
2. Vá na aba "Details"
3. Verifique "Last updated at" - deve mostrar a data/hora de hoje

### Método 2: Testar no Painel Admin

1. Acesse o painel admin → WhatsApp
2. Clique em "Gerar Novo QR"
3. Se aparecer o QR code, o deploy funcionou! ✅

---

## 📝 Comando Único (Se Já Está Configurado)

Se você já fez login e linkou o projeto antes:

```powershell
cd "C:\Users\thiag\Downloads\Barbearia"
npx supabase functions deploy whatsapp-manager
```

---

## 🆘 Ainda Não Funciona?

Se nenhum dos métodos acima funcionar, você pode fazer deploy via Dashboard:

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions/whatsapp-manager
2. **Vá na aba:** "Code"
3. **Abra o arquivo:** `supabase\functions\whatsapp-manager\index.ts` no seu editor
4. **Copie todo o conteúdo**
5. **Cole no editor** do Dashboard
6. **Clique em:** "Deploy" ou "Save"

---

## 🎯 Próximos Passos Após o Deploy

1. ✅ Verifique no Dashboard que a data de "Last updated" mudou
2. ✅ Teste gerar QR code no painel admin
3. ✅ Escaneie o QR code com o WhatsApp
4. ✅ O loop de 401 vai parar automaticamente!

---

**Execute o script `deploy-edge-function.ps1` ou os comandos manuais acima!** 🚀
