# 📱 Como Acessar o Sistema pelo Mobile

## ❌ Problema: Sistema não acessível pelo mobile

O servidor está rodando em `localhost:8080`, mas mobile precisa acessar pelo IP da rede.

---

## ✅ Solução Passo a Passo

### PASSO 1: Verificar IP Local

**No computador (onde o servidor roda):**

```powershell
ipconfig
```

Procure por **"IPv4"** e anote o IP (ex: `192.168.0.119`)

---

### PASSO 2: Verificar se Servidor Está Rodando

1. **Execute:** `iniciar-sistema.bat`
2. **Aguarde** aparecer:
   ```
   Local: http://localhost:8080
   Rede: http://192.168.0.119:8080
   ```
3. **Se não aparecer o IP**, o script detectou automaticamente

---

### PASSO 3: Verificar Firewall

**O Windows Defender pode estar bloqueando conexões externas:**

#### Opção A: Permitir Node.js no Firewall

1. **Abrir Firewall:**
   - Pressione `Win + R`
   - Digite: `wf.msc`
   - Enter

2. **Permitir aplicativo:**
   - Clique em "Permitir um aplicativo ou recurso através do Firewall"
   - Procure por "Node.js"
   - Marque **"Privado"** e **"Público"**
   - Se não encontrar, clique em "Permitir outro aplicativo"
   - Adicione: `C:\Program Files\nodejs\node.exe`

#### Opção B: Criar Regra de Porta (Mais Específico)

1. **Firewall → Regras de Entrada → Nova Regra**
2. **Tipo:** Porta
3. **Protocolo:** TCP
4. **Porta específica:** `8080`
5. **Ação:** Permitir conexão
6. **Perfis:** Marque todos (Domínio, Privado, Público)
7. **Nome:** "Vite Dev Server - Porta 8080"

---

### PASSO 4: Verificar se Vite Está Configurado Corretamente

O `vite.config.ts` já está configurado com:
```typescript
server: {
  host: "0.0.0.0", // ✅ Aceita conexões de todas as interfaces
  port: 8080,
}
```

**Se não estiver assim, atualize o arquivo.**

---

### PASSO 5: Acessar pelo Mobile

1. **Certifique-se que mobile e PC estão na mesma rede WiFi**
2. **No mobile, abra o navegador**
3. **Acesse:** `http://192.168.0.119:8080` (use o IP do seu PC)
4. **Deve carregar o sistema**

---

## 🔍 Troubleshooting

### Problema: "ERR_CONNECTION_REFUSED"

**Causas possíveis:**
1. Firewall bloqueando
2. Servidor não está rodando
3. IP incorreto
4. Mobile e PC em redes diferentes

**Solução:**
1. Verifique firewall (PASSO 3)
2. Verifique se servidor está rodando
3. Verifique IP com `ipconfig`
4. Certifique-se que estão na mesma WiFi

---

### Problema: "ERR_NETWORK_CHANGED"

**Causa:** Mobile mudou de rede ou IP mudou

**Solução:**
1. Verifique IP novamente: `ipconfig`
2. Use o novo IP no mobile

---

### Problema: Servidor não mostra IP no script

**Solução manual:**
1. Execute: `ipconfig` no PowerShell
2. Procure por "IPv4"
3. Use esse IP no mobile: `http://SEU_IP:8080`

---

## 🚀 Teste Rápido

### No PC:
```powershell
# 1. Verificar IP
ipconfig | findstr IPv4

# 2. Verificar se porta está aberta
netstat -ano | findstr :8080

# 3. Iniciar servidor
.\iniciar-sistema.bat
```

### No Mobile:
1. Abra navegador
2. Digite: `http://SEU_IP:8080`
3. Deve carregar

---

## 💡 Dicas Importantes

1. **Mesma Rede:** PC e mobile DEVEM estar na mesma WiFi
2. **Firewall:** Sempre verifique firewall primeiro
3. **IP Dinâmico:** Se o IP mudar, atualize no mobile
4. **Porta:** Certifique-se que porta 8080 está livre

---

## 📋 Checklist

- [ ] Servidor está rodando? (`npm run dev`)
- [ ] IP local identificado? (`ipconfig`)
- [ ] Firewall permitindo Node.js?
- [ ] Mobile e PC na mesma WiFi?
- [ ] Acessou `http://IP:8080` no mobile?
- [ ] Vite configurado com `host: "0.0.0.0"`? ✅ (já está)

---

**Status:** ⚠️ Verifique firewall e certifique-se que estão na mesma rede
