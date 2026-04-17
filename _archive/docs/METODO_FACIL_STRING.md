# 🎯 MÉTODO FÁCIL: Obter Connection String do Supabase

## ⚡ MÉTODO MAIS SIMPLES (2 PASSOS)

### PASSO 1: Resetar Senha do Banco

1. **Acesse:** https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/settings/database
2. **Role a página até:** "Database password"
3. **Clique em:** "Reset database password" (botão azul)
4. **COPIE A SENHA** que aparecer (ela só aparece uma vez!)

---

### PASSO 2: Construir Connection String

**Use este formato (substitua [SENHA] pela senha que você copiou):**

```
postgresql://postgres.wabefmgfsatlusevxyfo:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**Exemplo:**
Se a senha for `abc123xyz`, a string seria:
```
postgresql://postgres.wabefmgfsatlusevxyfo:abc123xyz@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

---

## ✅ EXECUTAR AGORA

**Depois de ter a connection string, execute:**

```powershell
.\configurar-com-supabase-agora.ps1
```

**OU execute o script que constrói automaticamente:**

```powershell
.\obter-string-supabase.ps1
```

---

## 🔍 SE NÃO FUNCIONAR COM `sa-east-1`

Tente estas outras regiões (substitua na string):

- `aws-0-us-east-1` (EUA Leste)
- `aws-0-eu-west-1` (Europa)
- `aws-0-ap-southeast-1` (Ásia)

---

**Siga os 2 passos acima e me avise quando tiver a string!** 🚀
