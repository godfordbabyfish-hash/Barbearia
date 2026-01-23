# Correção do Loop Infinito de 502 Bad Gateway

## Problema Identificado

O sistema estava preso em um loop infinito na tela de WhatsApp Manager, tentando continuamente carregar instâncias mesmo após múltiplos erros 502 Bad Gateway. Os logs mostravam:

- Repetidos erros `502 Bad Gateway`
- Mensagens "Muitos erros 502 - parando polling" (mas o polling não parava)
- Tentativas infinitas de criar instância "evolution-4"
- Mensagens "API ainda não está pronta, aguardando..." em loop

## Causa Raiz

O problema estava em múltiplos `useEffect` que continuavam tentando mesmo após detectar erros:

1. **Auto-create Effect (linha 155-209)**: Quando recebia um erro 502, resetava `autoCreated = false`, permitindo que o effect rodasse novamente
2. **Polling Effect (linha 122-152)**: Dependia de `hasError` e `errorCount`, mas não tinha um "circuit breaker" para parar completamente
3. **Falta de Cooldown**: Não havia período de espera entre tentativas após múltiplos erros

## Solução Implementada

### 1. Sistema de Cooldown
- Adicionado estado `cooldownUntil` para rastrear quando o sistema pode tentar novamente
- Após 5 erros consecutivos: cooldown de 5 minutos
- Após erro 502 ao criar instância: cooldown de 2 minutos
- Após outros erros: cooldown de 30 segundos

### 2. Circuit Breaker Melhorado
- O auto-create effect agora verifica `hasError` e `errorCount >= 5` antes de tentar
- Não reseta `autoCreated` quando há erro 502 persistente
- Polling só acontece se não estiver em cooldown

### 3. Reset Manual
- Botão "Atualizar" agora reseta cooldown, contadores de erro e flags
- Permite ao usuário forçar uma nova tentativa quando quiser

### 4. Feedback Visual Melhorado
- Mostra tempo restante de cooldown quando aplicável
- Mensagens diferentes para API que nunca funcionou vs. API temporariamente indisponível
- Não mostra loading infinito quando há erro persistente

## Mudanças no Código

### Novos Estados
```typescript
const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
```

### Lógica de Cooldown
- Verifica `cooldownUntil` antes de qualquer tentativa
- Define cooldown apropriado baseado no tipo de erro
- Limpa cooldown em caso de sucesso

### Prevenção de Loop
- Auto-create não tenta se `hasError && errorCount >= 5`
- Polling não inicia se em cooldown
- `autoCreated` não é resetado após erro 502 persistente

## Resultado Esperado

1. **Após 5 erros 502**: Sistema para completamente e entra em cooldown de 5 minutos
2. **Mensagem clara**: Usuário vê mensagem explicando o problema e tempo de espera
3. **Sem loop infinito**: Sistema não tenta mais até que o cooldown expire ou usuário clique em "Atualizar"
4. **Recuperação automática**: Após cooldown, sistema tenta novamente automaticamente
5. **Reset manual**: Usuário pode forçar nova tentativa a qualquer momento

## Como Testar

1. Acesse a página de WhatsApp Manager
2. Se a API estiver retornando 502, o sistema deve:
   - Tentar algumas vezes (até 5)
   - Parar e mostrar mensagem de cooldown
   - Não fazer mais tentativas até cooldown expirar
3. Clique em "Atualizar" para resetar e tentar novamente
4. Quando API voltar, o sistema deve detectar sucesso e limpar cooldown

## Próximos Passos

- Verificar se a Evolution API no Railway está realmente online
- Verificar se as variáveis de ambiente no Supabase estão corretas
- Testar conexão direta com a API do Railway
- Verificar logs da Edge Function `whatsapp-manager` no Supabase
