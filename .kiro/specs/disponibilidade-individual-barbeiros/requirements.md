# Disponibilidade Individual de Barbeiros - Requisitos

## Visão Geral
Implementar sistema de disponibilidade de horários baseado na disponibilidade individual de cada barbeiro, permitindo que um horário seja mostrado como disponível mesmo que alguns barbeiros estejam ocupados.

## Problema Atual
Atualmente, se um barbeiro tem agendamento em um horário específico, esse horário é bloqueado para todos os barbeiros, impedindo que clientes agendem com outros barbeiros disponíveis naquele mesmo horário.

## Solução Proposta
Modificar o sistema para:
1. Mostrar horários como disponíveis se **pelo menos um barbeiro** estiver livre
2. Ao selecionar um horário, mostrar apenas os barbeiros que estão disponíveis naquele horário
3. Ocultar barbeiros que já têm agendamentos ou pausas no horário selecionado

## User Stories

### US-1: Visualizar Horários com Disponibilidade Parcial
**Como** cliente  
**Quero** ver horários disponíveis mesmo que alguns barbeiros estejam ocupados  
**Para que** eu possa agendar com os barbeiros que estão livres naquele horário

**Critérios de Aceitação:**
- [ ] 1.1: Sistema deve mostrar um horário como disponível se pelo menos 1 barbeiro estiver livre
- [ ] 1.2: Horário só deve ser ocultado se TODOS os barbeiros estiverem ocupados
- [ ] 1.3: Sistema deve considerar duração do serviço ao verificar disponibilidade
- [ ] 1.4: Sistema deve considerar pausas dos barbeiros ao verificar disponibilidade

### US-2: Selecionar Barbeiro Disponível no Horário
**Como** cliente  
**Quero** ver apenas os barbeiros disponíveis quando seleciono um horário  
**Para que** eu não tente agendar com um barbeiro que está ocupado

**Critérios de Aceitação:**
- [ ] 2.1: Ao clicar em um horário, sistema deve mostrar lista de barbeiros disponíveis
- [ ] 2.2: Barbeiros ocupados devem ser ocultados ou marcados como indisponíveis
- [ ] 2.3: Se barbeiro estava selecionado e ficou indisponível, deve ser desmarcado automaticamente
- [ ] 2.4: Sistema deve mostrar indicador visual de quantos barbeiros estão disponíveis

### US-3: Validação de Conflitos por Barbeiro
**Como** sistema  
**Quero** validar conflitos de horário individualmente por barbeiro  
**Para que** cada barbeiro tenha sua própria agenda independente

**Critérios de Aceitação:**
- [ ] 3.1: Verificação de conflito deve ser feita apenas para o barbeiro selecionado
- [ ] 3.2: Sistema deve permitir agendamentos simultâneos para barbeiros diferentes
- [ ] 3.3: Sistema deve considerar duração do serviço ao verificar conflitos
- [ ] 3.4: Sistema deve considerar pausas individuais de cada barbeiro

## Regras de Negócio

### RN-1: Cálculo de Disponibilidade de Horário
Um horário é considerado disponível se:
- Pelo menos 1 barbeiro não tem agendamento naquele período
- E o barbeiro não está em pausa naquele período
- E o horário está dentro do horário de funcionamento

### RN-2: Duração do Serviço
- Sistema deve considerar a duração completa do serviço ao verificar disponibilidade
- Exemplo: Serviço de 30min às 17:00 ocupa o período 17:00-17:30
- Barbeiro só está disponível se todo o período estiver livre

### RN-3: Pausas dos Barbeiros
- Pausas individuais de cada barbeiro devem ser respeitadas
- Barbeiro em pausa não deve aparecer como disponível
- Outros barbeiros sem pausa devem continuar disponíveis

### RN-4: Prioridade de Seleção
- Se cliente já tinha um barbeiro selecionado e mudou de horário:
  - Se barbeiro continua disponível: manter seleção
  - Se barbeiro ficou indisponível: desmarcar e pedir nova seleção

## Fluxo de Uso

### Fluxo Principal: Agendar com Disponibilidade Individual

1. Cliente acessa página de agendamento
2. Cliente seleciona serviço
3. Sistema calcula horários disponíveis:
   - Para cada horário, verifica disponibilidade de cada barbeiro
   - Marca horário como disponível se pelo menos 1 barbeiro estiver livre
4. Cliente vê lista de horários disponíveis
5. Cliente clica em um horário
6. Sistema mostra apenas barbeiros disponíveis naquele horário
7. Cliente seleciona barbeiro disponível
8. Cliente confirma agendamento
9. Sistema valida conflito apenas para o barbeiro selecionado
10. Agendamento é criado com sucesso

### Fluxo Alternativo: Barbeiro Selecionado Fica Indisponível

1. Cliente seleciona barbeiro e horário
2. Cliente muda para outro horário
3. Sistema verifica se barbeiro selecionado está disponível no novo horário
4. Se indisponível:
   - Sistema desmarca barbeiro
   - Mostra mensagem: "Barbeiro não disponível neste horário. Selecione outro."
   - Mostra lista de barbeiros disponíveis
5. Cliente seleciona novo barbeiro disponível

## Exemplos Práticos

### Exemplo 1: Horário Parcialmente Ocupado
**Cenário:** 17:00 - Islan tem agendamento, Welton e Marcelo livres

**Comportamento Esperado:**
- ✅ Horário 17:00 aparece como disponível
- ✅ Ao clicar em 17:00, mostra apenas Welton e Marcelo
- ❌ Islan não aparece na lista ou aparece como indisponível

### Exemplo 2: Horário Totalmente Ocupado
**Cenário:** 18:00 - Todos os 3 barbeiros têm agendamento

**Comportamento Esperado:**
- ❌ Horário 18:00 NÃO aparece como disponível
- Sistema pula para próximo horário disponível

### Exemplo 3: Mudança de Horário
**Cenário:** Cliente selecionou Islan às 18:00, depois muda para 17:00

**Comportamento Esperado:**
- Sistema verifica: Islan disponível às 17:00? NÃO
- Sistema desmarca Islan
- Mostra mensagem pedindo nova seleção
- Lista apenas Welton e Marcelo como opções

## Impacto Técnico

### Componentes Afetados
1. `src/components/Booking.tsx` - Lógica de disponibilidade de horários
2. `src/hooks/useBarberAvailability.ts` - Hook de disponibilidade
3. `src/utils/barberAvailability.ts` - Utilitários de cálculo

### Mudanças Necessárias
1. Modificar função `getAvailableTimeSlots` para retornar horários com pelo menos 1 barbeiro livre
2. Criar função `getAvailableBarbersForSlot(date, time, serviceId)` 
3. Adicionar filtro de barbeiros ao selecionar horário
4. Atualizar validação de conflitos para ser por barbeiro

## Métricas de Sucesso
- [ ] Aumento de agendamentos realizados (mais horários disponíveis)
- [ ] Redução de horários "bloqueados" desnecessariamente
- [ ] Melhor distribuição de agendamentos entre barbeiros
- [ ] Feedback positivo dos clientes sobre disponibilidade

## Notas Técnicas
- Performance: Cálculo de disponibilidade pode ser mais pesado (verificar 3 barbeiros por horário)
- Considerar cache de disponibilidade para otimizar
- Realtime: Atualizar disponibilidade quando novo agendamento é criado
