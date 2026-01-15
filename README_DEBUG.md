# 🔧 Ambiente de Debug Local

## 🚀 Como Usar

### Opção 1: Script Automático (Recomendado)

Execute o script `start-dev.ps1`:

```powershell
.\start-dev.ps1
```

Este script:
- ✅ Verifica e instala dependências automaticamente
- ✅ Cria `.env` se não existir
- ✅ Limpa logs anteriores
- ✅ Inicia o servidor de desenvolvimento

### Opção 2: Manual

1. **Instalar dependências:**
   ```powershell
   npm install
   ```

2. **Iniciar servidor:**
   ```powershell
   npm run dev
   ```

3. **Monitorar logs (em outro terminal):**
   ```powershell
   .\monitor-logs.ps1
   ```

## 📊 Monitoramento de Logs

Os logs de debug são salvos automaticamente em:
- **Arquivo:** `.cursor\debug.log`
- **Formato:** NDJSON (uma linha JSON por entrada)

Para monitorar logs em tempo real em um terminal separado:
```powershell
.\monitor-logs.ps1
```

## 🌐 Acesso ao Servidor

Após iniciar, o servidor estará disponível em:
- **URL:** http://localhost:8080
- **Hot Reload:** Ativo (alterações são refletidas automaticamente)

## 🔍 O Que Os Logs Capturam

Os logs instrumentados capturam:
- **Hipótese A:** Variáveis de ambiente (VITE_SUPABASE_URL, etc.)
- **Hipótese C:** Tentativas de signup/signin (erros 400/401)
- **Hipótese D:** Busca de roles do usuário (erros 401)

Cada log contém:
- Timestamp
- Localização no código (arquivo:linha)
- Mensagem descritiva
- Dados relevantes (erros, status, valores)

## 🛠️ Solução de Problemas

### Porta 8080 já em uso:
```powershell
# Verificar processo usando a porta
netstat -ano | findstr :8080

# Matar processo (substitua PID)
taskkill /PID <PID> /F
```

### Erro ao instalar dependências:
```powershell
# Limpar cache e reinstalar
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

### Logs não aparecem:
- Verifique se o arquivo `.cursor\debug.log` está sendo criado
- Verifique se o servidor de logs está rodando (deve estar configurado automaticamente)
- Verifique o console do navegador para erros de rede

## 📝 Notas

- Os logs são limpos automaticamente ao iniciar com `start-dev.ps1`
- O servidor deve ser executado em segundo plano para não bloquear
- Use `Ctrl+C` para parar o servidor
