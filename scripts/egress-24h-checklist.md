# Cached Egress - Checklist de Comparação (24h)

Objetivo: comparar o consumo de `cached egress` antes/depois das otimizações de imagem e carregamento sob demanda.

## 1) Baseline (agora)

- Painel Supabase > Usage > Cached Egress
- Salvar os valores abaixo:
  - `Used in period`
  - `Overage in period`
  - `Cached Egress per day` (últimos 7 dias)

Template:

```txt
Data baseline: ____/____/______ ____:____
Used in period: ______ GB
Overage in period: ______ GB
Dias críticos: __________________________
Observações: ____________________________
```

## 2) Executar limpeza segura (dry-run)

```powershell
$env:SUPABASE_URL="https://SEU_PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
$env:RETENTION_DAYS="90"
node .\scripts\cleanup-appointment-photos.mjs
```

Esperado: listar candidatos sem apagar (`DRY-RUN`).

## 3) Aplicar limpeza (opcional e controlado)

### 3.1 Arquivar no mesmo bucket antes de apagar (recomendado)

```powershell
$env:ARCHIVE_PREFIX="archive-appointment-photos"
node .\scripts\cleanup-appointment-photos.mjs --apply
```

### 3.2 Apagar direto (sem arquivar)

```powershell
Remove-Item Env:ARCHIVE_PREFIX -ErrorAction SilentlyContinue
node .\scripts\cleanup-appointment-photos.mjs --apply
```

## 4) Conferência imediata (15-30 min)

- Abrir telas críticas e validar funcionamento:
  - `BarbeiroDashboard` (Histórico Serviços/Produtos)
  - `Shop`
  - `FilaDaBarbearia`
  - `ClienteDashboard`
- Confirmar que fotos carregam apenas quando solicitado (`Ver foto`) no histórico.

## 5) Comparação após 24h

Template:

```txt
Data comparação: ____/____/______ ____:____
Used in period: ______ GB
Overage in period: ______ GB

Delta estimado (24h):
- Tráfego diário antes: ______ GB
- Tráfego diário depois: ______ GB
- Redução: ______ %

Conclusão:
________________________________________
```

## 6) Critérios de sucesso

- Queda perceptível no gráfico diário de `Cached Egress`.
- Sem regressão nos fluxos de conclusão de atendimento e venda.
- Sem erro de carregamento de fotos no modal.
