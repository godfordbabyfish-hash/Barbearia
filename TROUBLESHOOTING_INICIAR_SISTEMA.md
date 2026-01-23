# 🔧 Troubleshooting - iniciar-sistema.bat

## ❌ Problema: Arquivo não abre ou servidor não inicia

### Possíveis Causas:

1. **Firewall bloqueando a porta 8080**
2. **Node.js/npm não instalado**
3. **Dependências não instaladas**
4. **Porta 8080 já em uso**
5. **Arquivo .bat bloqueado pelo Windows**

---

## ✅ Soluções

### Solução 1: Executar como Administrador

1. **Clique com botão direito** em `iniciar-sistema.bat`
2. Selecione **"Executar como administrador"**
3. Isso pode resolver problemas de permissão

---

### Solução 2: Verificar Firewall

O Windows Defender pode estar bloqueando a porta 8080:

1. **Abrir Firewall do Windows:**
   - Pressione `Win + R`
   - Digite: `wf.msc`
   - Pressione Enter

2. **Permitir aplicativo:**
   - Clique em "Permitir um aplicativo ou recurso através do Firewall"
   - Procure por "Node.js" ou "npm"
   - Marque as caixas para "Privado" e "Público"
   - Se não encontrar, clique em "Permitir outro aplicativo" e adicione:
     - `C:\Program Files\nodejs\node.exe`

3. **Ou desabilitar temporariamente** (apenas para teste):
   - Configurações → Rede e Internet → Firewall do Windows
   - Desabilite temporariamente para testar

---

### Solução 3: Verificar se Node.js está instalado

Abra PowerShell e execute:

```powershell
node --version
npm --version
```

Se não aparecer versão, instale Node.js:
- https://nodejs.org/
- Baixe a versão LTS
- Instale e reinicie o computador

---

### Solução 4: Instalar Dependências Manualmente

Se o script não instalar automaticamente:

```powershell
cd "c:\Users\thiag\Downloads\Barbearia"
npm install
```

---

### Solução 5: Verificar se Porta 8080 está em Uso

```powershell
netstat -ano | findstr :8080
```

Se aparecer algo, a porta está em uso. Você pode:
- Parar o processo que está usando a porta
- Ou mudar a porta no `vite.config.ts`

---

### Solução 6: Executar Manualmente

Se o .bat não funcionar, execute manualmente:

```powershell
cd "c:\Users\thiag\Downloads\Barbearia"
npm run dev
```

---

### Solução 7: Verificar Logs de Erro

Quando executar o `iniciar-sistema.bat`, observe:
- Se aparece alguma mensagem de erro
- Se o servidor inicia mas não conecta
- Se há mensagens sobre porta ou firewall

---

## 🚀 Teste Rápido

1. **Abra PowerShell como Administrador**
2. **Execute:**
   ```powershell
   cd "c:\Users\thiag\Downloads\Barbearia"
   npm run dev
   ```
3. **Observe as mensagens:**
   - Se aparecer "Local: http://localhost:8080" = Servidor iniciou!
   - Se aparecer erro = Veja a mensagem e siga as soluções acima

---

## 📋 Checklist

- [ ] Node.js instalado? (`node --version`)
- [ ] npm instalado? (`npm --version`)
- [ ] Dependências instaladas? (`node_modules` existe?)
- [ ] Arquivo .env existe?
- [ ] Firewall permitindo Node.js?
- [ ] Porta 8080 livre?
- [ ] Executou como Administrador?

---

## 💡 Dica

Se o servidor iniciar mas não conectar pela rede (`192.168.0.119:8080`):

1. Verifique se o IP está correto:
   ```powershell
   ipconfig
   ```
   Procure por "IPv4" e use esse IP

2. Verifique se o Vite está configurado para aceitar conexões externas:
   - `vite.config.ts` deve ter `host: "0.0.0.0"` ✅ (já está configurado)

3. Verifique firewall do Windows (veja Solução 2)

---

**Status:** ⚠️ Verifique firewall e execute como Administrador
