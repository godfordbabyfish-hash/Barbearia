# Solução: Remover Projeto Supabase Duplicado

## Situação

Você tem 2 projetos Supabase conectados localmente:
1. `tkzjppgvpoaoqlbaotir` (barberias)
2. `wabefmgfsatlusevxyfo` (godfordbabyfish-hash's Project) ✅ **Este é o correto**

## Solução Rápida

Quando o Supabase CLI mostrar a lista de projetos para escolher:

1. **Use as setas** (↑/↓) para navegar
2. **Selecione o projeto:** `wabefmgfsatlusevxyfo [name: godfordbabyfish-hash's Project]`
3. **Pressione Enter**

Isso vai fazer o deploy apenas no projeto correto.

## Solução Permanente

Para garantir que sempre use o projeto correto:

### Opção 1: Especificar Projeto no Comando

Ao fazer deploy, especifique o projeto diretamente:

```powershell
npx supabase functions deploy whatsapp-manager --project-ref wabefmgfsatlusevxyfo
```

### Opção 2: Deslinkar e Relinkar

1. **Deslinkar todos os projetos:**
   ```powershell
   npx supabase unlink
   ```

2. **Linkar apenas o projeto correto:**
   ```powershell
   npx supabase link --project-ref wabefmgfsatlusevxyfo
   ```

### Opção 3: Verificar Config Local

O arquivo `supabase/config.toml` já está configurado corretamente:
```toml
project_id = "wabefmgfsatlusevxyfo"
```

Isso significa que o projeto local já está linkado corretamente. O problema é apenas na seleção interativa do CLI.

## Recomendação

**Use a Opção 1** - é a mais rápida e não requer mudanças:

```powershell
npx supabase functions deploy whatsapp-manager --project-ref wabefmgfsatlusevxyfo
```

Isso vai fazer o deploy diretamente no projeto correto, sem mostrar a lista de seleção.

## Verificação

Após fazer o deploy, verifique se foi no projeto correto:

1. Acesse: https://supabase.com/dashboard/project/wabefmgfsatlusevxyfo/functions
2. Verifique se a função `whatsapp-manager` foi atualizada

## Nota

O outro projeto (`barberias`) não precisa ser removido da sua conta Supabase. Ele só não será usado se você sempre especificar o `--project-ref wabefmgfsatlusevxyfo` nos comandos.
