# 📱 Solução Rápida - Acesso Mobile

## 🚀 Passos Rápidos

### 1. Obter IP do PC

**Execute no PowerShell:**
```powershell
.\obter-ip-local.ps1
```

**OU manualmente:**
```powershell
ipconfig | findstr IPv4
```

Anote o IP (ex: `192.168.0.119`)

---

### 2. Iniciar Servidor

**Execute:**
```powershell
.\iniciar-sistema.bat
```

**Aguarde aparecer:**
```
Local: http://localhost:8080
Rede: http://192.168.0.119:8080
```

---

### 3. Configurar Firewall (IMPORTANTE)

**Opção A - Via Script (Requer Admin):**
```powershell
# Execute como Administrador
New-NetFirewallRule -DisplayName "Vite Dev Server - Porta 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

**Opção B - Manual:**
1. Pressione `Win + R`
2. Digite: `wf.msc`
3. Regras de Entrada → Nova Regra
4. Porta → TCP → 8080 → Permitir
5. Aplique a todos os perfis

---

### 4. Acessar no Mobile

1. **Certifique-se que mobile e PC estão na mesma WiFi**
2. **No mobile, abra navegador**
3. **Digite:** `http://SEU_IP:8080` (use o IP do passo 1)
4. **Deve carregar!**

---

## ❌ Se Não Funcionar

### Verificar:
- [ ] Servidor está rodando?
- [ ] IP está correto?
- [ ] Firewall configurado?
- [ ] Mobile e PC na mesma WiFi?
- [ ] Porta 8080 livre?

### Teste de Conexão:
No mobile, tente pingar o IP do PC (se tiver app de ping)

---

## 💡 Dica

Se o IP mudar, execute `.\obter-ip-local.ps1` novamente e use o novo IP.

---

**Status:** ⚠️ Configure firewall e certifique-se que estão na mesma rede
