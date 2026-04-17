# ⚡ CONFIGURAR RENDER VIA API (Automático)

## 🎯 Método Automatizado

Este método usa a API REST do Render para configurar tudo automaticamente!

## ✅ PASSO 1: Obter Service ID

1. Acesse: https://dashboard.render.com
2. Clique no serviço **`evolution-api`**
3. A URL será algo como: `https://dashboard.render.com/web/srv-d5ogsj14tr6s73eor11g`
4. O **Service ID** é a parte `srv-d5ogsj14tr6s73eor11g`
5. **Copie esse ID**

## ✅ PASSO 2: Obter API Key

1. Acesse: https://dashboard.render.com/account/api-keys
2. Clique em **"New API Key"**
3. Dê um nome (ex: "Configuracao Evolution API")
4. **Copie a chave gerada** (ela só aparece uma vez!)

## ✅ PASSO 3: Executar Script

Execute o script PowerShell:

```powershell
.\configurar-render-api.ps1
```

O script vai:
1. ✅ Solicitar o Service ID
2. ✅ Solicitar a API Key
3. ✅ Configurar Docker Command = `npm start`
4. ✅ Configurar todas as 6 variáveis de ambiente
5. ✅ Triggerar redeploy automático

## 📋 O QUE SERÁ CONFIGURADO

### Docker Command
```
npm start
```

### Environment Variables
```
AUTHENTICATION_API_KEY=testdaapi2026
CORS_ORIGIN=*
DATABASE_ENABLED=false
DATABASE_PROVIDER=postgresql
REDIS_ENABLED=false
PORT=8080
```

## 🎉 APÓS EXECUTAR

1. O Render vai fazer **redeploy automaticamente**
2. Aguarde 3-5 minutos para status ficar **"Live"**
3. Teste: `https://evolution-api-bfri.onrender.com/health`
4. Execute: `.\testar-evolution-render.ps1`

## 🚨 SE DER ERRO

Se a API retornar erro:

1. **Verifique o Service ID** (deve começar com `srv-`)
2. **Verifique a API Key** (deve ter permissões de escrita)
3. **Tente manualmente** seguindo: `EXECUTAR_AGORA_RENDER.md`

## 💡 VANTAGENS DESTE MÉTODO

- ✅ **Totalmente automatizado**
- ✅ **Não precisa clicar no dashboard**
- ✅ **Configura tudo de uma vez**
- ✅ **Pode ser repetido facilmente**

---

**Execute o script e me avise o resultado!** 🚀
