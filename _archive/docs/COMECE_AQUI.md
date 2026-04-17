# 🚀 COMECE AQUI - DEPLOY EVOLUTION API

## ⚡ EXECUTE AGORA

```powershell
.\criar-fly-config.ps1
```

**Isso é tudo!** O script faz tudo automaticamente.

---

## ✅ O QUE VAI ACONTECER

1. **Instala Fly CLI** (se necessário)
2. **Abre navegador** para login no Fly.io (faça login)
3. **Cria o app** no Fly.io
4. **Configura variáveis** de ambiente
5. **Faz deploy** (5-10 minutos)
6. **Testa** se está funcionando
7. **Atualiza Supabase** automaticamente

**Total:** ~10 minutos

---

## 📋 APÓS O DEPLOY

### Verificar se está tudo OK:
```powershell
.\testar-evolution-fly.ps1
```

### Ver logs:
```powershell
fly logs --app evolution-api-barbearia
```

---

## 🎉 PRONTO!

Agora você pode:
- ✅ Criar instância WhatsApp no painel admin
- ✅ Receber notificações automáticas
- ✅ Tudo funcionando! 🚀

---

## 🐛 PROBLEMAS?

### Deploy falhou:
```powershell
fly logs --app evolution-api-barbearia
```

### Supabase não atualizou:
```powershell
.\atualizar-supabase-url.ps1
```

---

**Execute:** `.\criar-fly-config.ps1` 🚀
