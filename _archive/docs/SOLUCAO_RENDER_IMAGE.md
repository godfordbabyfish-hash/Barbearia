# Solução: Render não encontra imagem Docker

## Problema
O Render está dando erro "No public image found" ao tentar usar `atendai/evolution-api:v2.3.7`.

## Soluções (tente nesta ordem)

### Solução 1: Usar `latest` (mais simples)

1. No modal "Update Image" do Render
2. Altere a **Image URL** para: `atendai/evolution-api:latest`
3. Clique em **Save Changes**
4. Aguarde o redeploy

### Solução 2: Usar formato completo do Docker Hub

1. Altere a **Image URL** para: `docker.io/atendai/evolution-api:latest`
2. Ou tente: `hub.docker.com/r/atendai/evolution-api:latest`
3. Clique em **Save Changes**

### Solução 3: Conectar repositório GitHub (RECOMENDADO se Docker não funcionar)

Se as opções acima não funcionarem, use o repositório oficial:

1. **Delete o serviço atual** no Render
2. Crie um **novo Web Service**
3. Em vez de Docker, selecione **"Public Git repository"**
4. Conecte: `https://github.com/EvolutionAPI/evolution-api`
5. Configure:
   - **Branch**: `main` ou `v2` (verifique qual existe)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (ou verifique o package.json)
6. Adicione as mesmas variáveis de ambiente:
   ```
   API_KEY=testdaapi2026
   CORS_ORIGIN=*
   DATABASE_ENABLED=false
   SKIP_DB_MIGRATION=true
   PORT=8080
   ```

### Solução 4: Verificar tags disponíveis

Se quiser usar uma versão específica, verifique as tags disponíveis:
- Acesse: https://hub.docker.com/r/atendai/evolution-api/tags
- Use uma tag que realmente existe (ex: `v2.3.3`, `v2.2.3`, etc.)

## Recomendação

**Tente primeiro a Solução 1** (`latest`). Se funcionar, ótimo. Se não, use a **Solução 3** (repositório GitHub), que é mais confiável e permite controle total.
