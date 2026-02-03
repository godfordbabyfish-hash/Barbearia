# Plano de Implementação: Correções Críticas

## Visão Geral

Este plano implementa as correções para dois problemas críticos: falha na remoção de vales devido ao RLS e loops de auto-relogin do WhatsApp. A abordagem é incremental, começando pela função RPC segura, seguida pela refatoração dos componentes React.

## Tarefas

- [x] 1. Criar função RPC para remoção segura de vales
  - Implementar função `delete_barber_advance_admin` com SECURITY DEFINER
  - Adicionar validação de permissões de gestor/admin
  - Implementar tratamento de erros específicos
  - _Requisitos: 1.1, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 1.1 Escrever testes de propriedade para função RPC
  - **Propriedade 1: Remoção bem-sucedida de vales**
  - **Propriedade 2: Bloqueio de usuários não autorizados**
  - **Propriedade 3: Tratamento de vales inexistentes**
  - **Valida: Requisitos 1.1, 1.5, 4.1, 4.3, 4.4**

- [x] 2. Refatorar BarberAdvancesManager para usar nova RPC
  - Substituir tentativas de DELETE direto pela chamada RPC
  - Implementar tratamento de respostas da função RPC
  - Adicionar feedback visual para operações de remoção
  - Atualizar interface imediatamente após remoção bem-sucedida
  - _Requisitos: 1.1, 1.3, 1.4_

- [ ]* 2.1 Escrever testes unitários para BarberAdvancesManager
  - Testar cenários de sucesso e falha na remoção
  - Testar atualização da interface após remoção
  - Testar exibição de mensagens de erro
  - _Requisitos: 1.3, 1.4_

- [ ]* 2.2 Escrever teste de propriedade para feedback de interface
  - **Propriedade 5: Exibição de erros de remoção**
  - **Valida: Requisitos 1.4**

- [-] 3. Checkpoint - Validar remoção de vales
  - Garantir que todos os testes passam, perguntar ao usuário se há dúvidas.

- [x] 4. Criar serviço de gerenciamento de conexão WhatsApp
  - Implementar `WhatsAppConnectionService` com controle de estado
  - Adicionar métodos para connect, disconnect e getStatus
  - Implementar sistema de callbacks para mudanças de estado
  - Remover lógica de polling automático
  - _Requisitos: 2.1, 2.2, 2.4, 3.4_

- [ ]* 4.1 Escrever testes de propriedade para serviço de conexão
  - **Propriedade 7: Estabilidade de conexão estabelecida**
  - **Propriedade 9: Reatividade da interface**
  - **Valida: Requisitos 2.4, 3.4**

- [x] 5. Refatorar WhatsAppManager para controle manual
  - Remover todos os useEffect com polling automático
  - Implementar botões para conectar/desconectar manualmente
  - Adicionar indicadores visuais de status (verde/vermelho/amarelo)
  - Implementar limpeza adequada de recursos React
  - _Requisitos: 2.1, 2.3, 3.1, 3.2, 3.3, 5.2, 5.3_

- [ ]* 5.1 Escrever testes de propriedade para controle manual
  - **Propriedade 6: Parada de processos automáticos quando conectado**
  - **Propriedade 8: Controle manual de erros**
  - **Propriedade 10: Limpeza de recursos React**
  - **Valida: Requisitos 2.2, 2.3, 2.5, 5.1, 5.2, 5.3**

- [ ]* 5.2 Escrever testes unitários para WhatsAppManager
  - Testar renderização de estados específicos (conectado, desconectado, erro)
  - Testar ações de botões conectar/desconectar
  - Testar limpeza de recursos no unmount
  - _Requisitos: 2.1, 2.3, 3.1, 3.2, 3.3_

- [x] 6. Implementar persistência de estado entre páginas
  - Adicionar armazenamento de estado de conexão no localStorage/sessionStorage
  - Implementar recuperação de estado no carregamento da página
  - Garantir que não há inicialização automática de conexão
  - _Requisitos: 3.5, 5.5_

- [ ]* 6.1 Escrever teste de propriedade para persistência
  - **Propriedade 11: Persistência de estado durante navegação**
  - **Valida: Requisitos 5.5**

- [x] 7. Implementar botão de reiniciar servidor Railway
  - Criar Edge Function `restart-railway-service` para controlar Railway via API
  - Adicionar botão "Reiniciar Railway" no WhatsAppManager
  - Implementar tratamento de erros e feedback visual
  - Configurar RAILWAY_TOKEN nas variáveis de ambiente
  - _Requisitos: Controle manual do servidor WhatsApp_

- [x] 8. Checkpoint - Validar controle de WhatsApp
  - Edge Function deployada com sucesso
  - Botão implementado e funcional
  - Aguardando teste do usuário

- [ ] 8. Integração e testes finais
  - Integrar todos os componentes refatorados
  - Verificar que não há vazamentos de memória
  - Testar fluxos completos de remoção de vales
  - Testar ciclos completos de conexão/desconexão WhatsApp
  - _Requisitos: Todos_

- [ ]* 8.1 Escrever testes de integração
  - Testar fluxo completo: UI → RPC → Database para remoção de vales
  - Testar ciclo completo de conexão WhatsApp
  - Testar navegação entre páginas mantendo estado
  - _Requisitos: Todos_

- [ ] 9. Checkpoint final - Validação completa
  - Garantir que todos os testes passam, perguntar ao usuário se há dúvidas.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam propriedades universais de correção
- Testes unitários validam exemplos específicos e casos extremos
- A função RPC com SECURITY DEFINER é essencial para contornar RLS de forma segura
- A remoção de polling automático é crítica para eliminar loops de reconexão