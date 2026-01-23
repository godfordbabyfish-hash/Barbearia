# Ajuste: Cooldown Reduzido e Tentativas Imediatas

## Problema

O usuário relatou que não faz sentido esperar 5 minutos quando a Evolution API está funcionando no Railway. O sistema estava sendo muito conservador com cooldowns longos.

## Solução Implementada

### 1. Cooldowns Drasticamente Reduzidos

**Antes:**
- Após 5 erros: 5 minutos de cooldown
- Após erro 502 ao criar instância: 2 minutos
- Após outros erros: 30 segundos

**Agora:**
- Após 5 erros: **30 segundos** de cooldown
- Após erro 502 ao criar instância: **15 segundos**
- Após outros erros: **10 segundos**

### 2. Botão "Atualizar" Sempre Funcional

- **Antes**: Botão desabilitado durante cooldown
- **Agora**: Botão **sempre habilitado** e permite forçar tentativa imediata
- O botão mostra "Tentar Agora (Xs)" durante cooldown, indicando que pode forçar
- Ao clicar, reseta cooldown e tenta imediatamente

### 3. Auto-Create Mais Agressivo

- **Antes**: Bloqueava completamente após muitos erros
- **Agora**: 
  - Ainda tenta criar instância mesmo após muitos erros
  - Apenas aguarda 10 segundos antes de tentar novamente
  - Respeita cooldown curto mas não bloqueia completamente

### 4. Mensagens Melhoradas

- Mensagens agora indicam que o usuário pode forçar tentativa imediata
- Mostra tempo restante de cooldown em segundos (não minutos)
- Deixa claro que o cooldown é apenas automático - pode ser ignorado

## Benefícios

1. **Resposta Rápida**: Se a API está funcionando, o sistema tenta imediatamente
2. **Controle do Usuário**: Usuário pode forçar tentativa a qualquer momento
3. **Menos Espera**: Cooldowns muito mais curtos (segundos, não minutos)
4. **Melhor UX**: Mensagens claras sobre como forçar tentativa

## Como Usar

### Quando API Está Funcionando:
1. Sistema tenta automaticamente a cada 30 segundos (se houver erros anteriores)
2. **OU** clique em "Tentar Agora" para forçar tentativa imediata
3. Não precisa esperar 5 minutos!

### Quando API Não Está Funcionando:
1. Sistema aguarda 30 segundos automaticamente
2. **OU** clique em "Tentar Agora" para forçar tentativa imediata
3. Se API estiver funcionando, conecta imediatamente

## Mudanças Técnicas

### Estados e Lógica
- Cooldowns reduzidos de minutos para segundos
- Botão "Atualizar" nunca desabilitado por cooldown
- Auto-create não bloqueia completamente após erros
- Reset de cooldown ao clicar em "Atualizar"

### Mensagens
- Mostra tempo em segundos (não minutos)
- Indica que pode forçar tentativa
- Mais claro sobre o que fazer

## Resultado

**Antes**: "Aguarde 5 minutos antes de tentar novamente" ❌

**Agora**: "Cooldown automático: 30 segundos. Ou clique em 'Tentar Agora' para forçar tentativa imediata." ✅

O usuário tem controle total e não precisa esperar quando sabe que a API está funcionando!
