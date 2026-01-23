# 🔧 CORRIGIR VARIÁVEIS AGORA - Database Provider Invalid

## ⚠️ PROBLEMA
O erro "Database provider invalid" continua mesmo com `DATABASE_ENABLED=false`.

## ✅ SOLUÇÃO IMEDIATA

### Passo 1: Acessar Environment Variables
1. No Render, vá no serviço `evolution-api`
2. Clique em **Settings**
3. Role até **"Environment Variables"**

### Passo 2: DELETAR variáveis incorretas (se existirem)
- ❌ Delete `API_KEY` (se existir)
- ❌ Delete `DATABASE_PROVIDER` (se existir)

### Passo 3: ADICIONAR/ATUALIZAR estas variáveis (uma por uma)

**Adicione TODAS estas variáveis:**

```
AUTHENTICATION_API_KEY=testdaapi2026
```

```
CORS_ORIGIN=*
```

```
DATABASE_ENABLED=false
```

```
SKIP_DB_MIGRATION=true
```

```
REDIS_ENABLED=false
```

```
PORT=8080
```

```
DATABASE_PROVIDER=postgresql
```

**⚠️ IMPORTANTE:** Adicione `DATABASE_PROVIDER=postgresql` mesmo com `DATABASE_ENABLED=false`. Isso é necessário devido a um bug na Evolution API que valida o provider antes de verificar se o banco está habilitado.

### Passo 4: Verificar
- ✅ Confirme que tem **7 variáveis** no total
- ✅ Confirme que `AUTHENTICATION_API_KEY` existe (não `API_KEY`)
- ✅ Confirme que `DATABASE_PROVIDER=postgresql` existe (necessário devido ao bug)
- ✅ Confirme que `DATABASE_ENABLED=false` está configurado
- ✅ Confirme que todas estão com os valores corretos

### Passo 5: Salvar e Redeploy
1. Clique em **"Save Changes"** (se houver)
2. O Render vai fazer redeploy automaticamente
3. Aguarde o status ficar **"Live"**

## 🎯 DIFERENÇAS CRÍTICAS

| ❌ ERRADO | ✅ CORRETO |
|-----------|------------|
| `API_KEY=...` | `AUTHENTICATION_API_KEY=...` |
| Sem `DATABASE_PROVIDER` | `DATABASE_PROVIDER=postgresql` (necessário devido ao bug) |
| Sem `REDIS_ENABLED` | `REDIS_ENABLED=false` |

## 📝 CHECKLIST FINAL

Antes de aguardar o deploy, confirme:

- [ ] `AUTHENTICATION_API_KEY=testdaapi2026` existe
- [ ] `DATABASE_ENABLED=false` existe
- [ ] `DATABASE_PROVIDER=postgresql` existe (necessário devido ao bug)
- [ ] `SKIP_DB_MIGRATION=true` existe
- [ ] `REDIS_ENABLED=false` existe
- [ ] `CORS_ORIGIN=*` existe
- [ ] `PORT=8080` existe
- [ ] `API_KEY` **NÃO existe** (foi deletada)

## 🚀 Após o Deploy

Quando o status ficar **"Live"**:
1. Teste: `https://sua-url.onrender.com/health`
2. Execute: `.\testar-evolution-render.ps1`
3. Atualize no Supabase: `.\atualizar-evolution-url.ps1`
