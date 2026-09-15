# Plano Seguro de Redução de Egress em Produção

## Finalidade

Este documento é o checklist obrigatório para qualquer etapa de redução de egress do sistema da Barbearia Raimundos.

O objetivo é reduzir tráfego desnecessário no Supabase sem alterar regras de negócio, dados, valores, agendamentos, notificações ou qualquer função já utilizada em produção.

Antes de começar uma etapa, leia este arquivo por completo. Ao finalizar, preencha o registro da etapa, execute todas as validações aplicáveis e somente avance quando os critérios de aprovação estiverem atendidos.

## Regras invioláveis de produção

Nenhuma etapa pode alterar, apagar, recalcular ou recriar:

- Valores de serviços, produtos, pagamentos ou despesas.
- Agendamentos existentes ou seus horários.
- Regras de disponibilidade, conflito de horário ou encaixe.
- Status de atendimentos, pagamentos ou vendas.
- Comissões, vales, caixa, estoque ou fechamentos.
- Clientes, barbeiros, administradores ou demais usuários.
- Indicações, cupons ou benefícios já concedidos.
- Permissões, autenticação ou políticas RLS.
- Conteúdo e funcionamento das notificações necessárias.
- Arquivos originais armazenados no Storage.

É proibido executar em produção:

- `DELETE`, `TRUNCATE`, limpeza em massa ou atualização sem filtro validado.
- Alteração destrutiva de tabelas, colunas, constraints, funções ou políticas.
- Reprocessamento de dados históricos sem autorização específica.
- Mudança direta no banco sem migration versionada, quando uma mudança de banco for realmente necessária.
- Desativação de notificações, Realtime, Edge Functions ou Cron sem comprovar que o recurso está obsoleto.
- Commit ou push antes das validações da etapa.

## Princípios permitidos

As otimizações devem se limitar a:

- Remover polling redundante quando já existe uma atualização confiável.
- Reduzir a frequência de consultas sem comprometer a atualização necessária.
- Pausar consultas quando a página estiver oculta.
- Evitar canais Realtime duplicados.
- Aplicar filtros mais específicos aos canais e consultas.
- Buscar somente colunas e registros utilizados pela tela.
- Manter paginação no banco e carregar somente a página visível.
- Evitar recarregar módulos que não foram afetados por uma alteração.
- Aplicar debounce a eventos consecutivos.
- Usar cache em configurações e cadastros que mudam pouco.
- Servir miniaturas otimizadas, preservando o arquivo original.
- Reduzir respostas de Edge Functions sem modificar seus efeitos.

## Procedimento obrigatório de cada etapa

### 1. Antes de alterar

- [ ] Confirmar que o projeto Supabase e o repositório são os corretos.
- [ ] Verificar a branch atual e o estado do Git.
- [ ] Identificar e preservar alterações anteriores ou arquivos do usuário.
- [ ] Registrar quais arquivos, consultas, canais ou funções serão analisados.
- [ ] Registrar o comportamento atual que precisa ser preservado.
- [ ] Registrar a categoria de egress que a etapa pretende reduzir.
- [ ] Consultar documentação atual do Supabase para qualquer recurso alterado.
- [ ] Confirmar que a mudança não depende de apagar ou transformar dados existentes.
- [ ] Definir como desfazer a mudança antes de implementá-la.

### 2. Durante a implementação

- [ ] Alterar apenas o escopo previsto para a etapa.
- [ ] Não modificar regras comerciais ou cálculos operacionais.
- [ ] Não misturar refatorações estéticas ou funcionalidades novas.
- [ ] Preservar fallback para imagens, notificações e atualizações críticas.
- [ ] Garantir limpeza de timers, listeners e canais ao sair da página.
- [ ] Garantir que cache não mantenha informação operacional desatualizada.
- [ ] Manter logs de desenvolvimento fora da produção.
- [ ] Criar migration somente se uma mudança de banco for indispensável.

### 3. Validação técnica

- [ ] Executar verificação TypeScript.
- [ ] Executar build do projeto.
- [ ] Executar lint e testes disponíveis.
- [ ] Executar `git diff --check`.
- [ ] Revisar o diff para confirmar que não houve alteração fora do escopo.
- [ ] Confirmar ausência de consultas, timers ou canais duplicados.
- [ ] Confirmar que respostas continuam contendo todos os campos necessários.
- [ ] Quando houver banco, executar advisors e uma consulta de verificação somente leitura.

### 4. Testes obrigatórios de regressão

Execute os testes relacionados à etapa. Se a alteração alcançar código compartilhado, execute todos.

- [ ] Login de cliente.
- [ ] Login de barbeiro.
- [ ] Login de administrador ou gestor.
- [ ] Criação de agendamento online.
- [ ] Criação de agendamento local.
- [ ] Prevenção de conflito e duplicidade de horário.
- [ ] Criação de encaixe.
- [ ] Confirmação, edição e cancelamento de agendamento.
- [ ] Início e conclusão de atendimento.
- [ ] Registro e visualização de pagamento.
- [ ] Cálculo e exibição de comissão.
- [ ] Atualização da fila pública.
- [ ] Atualização da fila autenticada.
- [ ] Notificações para os perfis envolvidos.
- [ ] Histórico CP e seus filtros.
- [ ] Serviços, produtos e estoque.
- [ ] Fotos, logos e imagens em celular e computador.
- [ ] Funcionamento com a aba em primeiro e segundo plano.

### 5. Critérios para aprovar a etapa

A etapa somente pode ser considerada concluída quando:

- [ ] Nenhum dado de produção foi alterado indevidamente.
- [ ] Todos os comportamentos anteriores continuam funcionando.
- [ ] Nenhuma notificação necessária foi perdida.
- [ ] Nenhuma imagem necessária deixou de aparecer.
- [ ] Nenhum horário ficou disponível ou indisponível indevidamente.
- [ ] Não houve duplicidade de agendamento.
- [ ] A otimização reduz chamadas, registros retornados ou bytes transferidos de forma verificável.
- [ ] Existe uma forma clara e rápida de rollback.
- [ ] O resultado e as evidências foram registrados neste documento.

### 6. Publicação e acompanhamento

- [ ] Criar um commit pequeno e descritivo somente após aprovação.
- [ ] Registrar o hash do commit.
- [ ] Publicar conforme o fluxo atual do projeto.
- [ ] Fazer teste rápido no ambiente publicado.
- [ ] Monitorar erros e consumo após a publicação.
- [ ] Comparar egress com o período de referência por 24 a 48 horas.
- [ ] Reverter imediatamente se houver impacto operacional.
- [ ] Não iniciar a próxima etapa durante uma instabilidade da etapa atual.

## Ordem das etapas

### Etapa 1 — Linha de base e diagnóstico

Objetivo: identificar a origem real do aumento antes de otimizar.

- Registrar Egress e Cached Egress atuais.
- Separar Database, Storage, Realtime, Auth e Edge Functions.
- Identificar dias e horários de pico.
- Consultar endpoints e consultas mais frequentes.
- Registrar média diária e período de comparação.

Não altera código nem banco.

### Etapa 2 — Histórico CP

Objetivo: eliminar atualização redundante a cada 10 segundos.

- Preservar Realtime.
- Preservar atualização manual.
- Atualizar somente a aba e página visíveis.
- Aplicar debounce aos eventos.
- Pausar atividade com a página oculta.
- Confirmar atualização após serviço, venda e pagamento.

### Etapa 3 — Fila da barbearia

Objetivo: reduzir consultas repetidas sem deixar a fila desatualizada.

- Manter Realtime para usuários autorizados.
- Ajustar atualização de visitantes para um intervalo seguro.
- Pausar polling em segundo plano.
- Atualizar imediatamente ao retornar para a página.
- Buscar apenas período, barbeiros e campos exibidos.
- Validar encaixes e posições da fila.

### Etapa 4 — Canais Realtime

Objetivo: evitar canais duplicados e recargas completas.

- Inventariar todos os canais.
- Assinar somente módulos visíveis.
- Aplicar filtros por usuário ou entidade quando possível.
- Remover canais corretamente no cleanup.
- Aplicar debounce.
- Atualizar somente o módulo afetado.
- Preservar notificações necessárias.

### Etapa 5 — Consultas e cache

Objetivo: reduzir tamanho e quantidade das respostas.

- Remover `select('*')` desnecessário.
- Aplicar paginação e limites.
- Selecionar somente campos utilizados.
- Evitar consultas duplicadas entre componentes.
- Aplicar cache em configurações, serviços, produtos, barbeiros e horários.
- Invalidar o cache após alteração administrativa.
- Não aplicar cache longo em fila, pagamento ou disponibilidade.

### Etapa 6 — Storage e imagens

Objetivo: reduzir bytes sem perda visual.

- Preservar arquivos originais.
- Criar versões WebP no upload.
- Usar 128 px para miniaturas e avatares.
- Usar 400 px para cartões no celular.
- Usar 800 px para cartões em telas maiores.
- Carregar original somente na ampliação.
- Usar lazy loading onde aplicável.
- Configurar cache longo com arquivo versionado.
- Testar fallback em todos os perfis.

### Etapa 7 — Edge Functions e automações

Objetivo: reduzir respostas e execuções desnecessárias.

- Mapear funções realmente utilizadas.
- Revisar tamanho das respostas.
- Verificar consultas repetidas dentro das funções.
- Revisar Cron e frequência das tarefas.
- Preservar WhatsApp, relatórios e rotinas ativas.
- Não remover função sem comprovação de desuso.

### Etapa 8 — Monitoramento final

Objetivo: comprovar o ganho e prevenir regressões.

- Comparar consumo antes e depois.
- Monitorar por no mínimo 24 horas; preferencialmente 48 horas.
- Conferir erros no frontend, banco, Realtime e Edge Functions.
- Registrar ganho por categoria.
- Definir alertas para crescimento fora do padrão.
- Documentar pendências e próximos ajustes.

## Registro obrigatório por etapa

Copie e preencha este bloco ao concluir cada etapa:

```text
Etapa:
Data e horário:
Responsável:
Branch:
Commit:

Objetivo da etapa:

Comportamento preservado:

Arquivos alterados:

Banco ou migration alterados:
Não / Sim — detalhar:

Medição antes:
- Database Egress:
- Storage Egress:
- Cached Egress:
- Realtime Egress:
- Edge Functions Egress:
- Período medido:

Alterações realizadas:

Validações executadas:

Testes de regressão executados:

Resultado:

Medição após 24–48 horas:
- Database Egress:
- Storage Egress:
- Cached Egress:
- Realtime Egress:
- Edge Functions Egress:
- Período medido:

Ganho confirmado:

Problemas encontrados:

Rollback definido:

Situação final:
Aprovada / Reprovada / Revertida / Em observação
```

## Regra de parada

Interrompa imediatamente a etapa se ocorrer qualquer uma destas situações:

- Divergência de valores.
- Agendamento duplicado, perdido ou indisponível indevidamente.
- Falha em encaixes.
- Falha em pagamentos ou comissões.
- Notificação importante não entregue.
- Foto, logo ou arquivo necessário indisponível.
- Erro de autenticação ou autorização.
- Acesso indevido a dados.
- Aumento inesperado de consultas ou egress.
- Falta de evidência suficiente para afirmar que a mudança é segura.

Quando uma regra de parada for acionada, não avance para a etapa seguinte. Registre o problema, reverta a alteração e repita os testes antes de uma nova tentativa.

## Meta do plano

- Reduzir consultas repetitivas em pelo menos 70%.
- Reduzir Database Egress entre 40% e 80%, conforme a origem confirmada.
- Reduzir Storage Egress entre 50% e 85%, sem perda visual perceptível.
- Preservar notificações, fila, agendamentos e operação financeira.
- Manter todas as mudanças pequenas, verificáveis e reversíveis.

## Registro — Etapa 1: linha de base e diagnóstico

Data e horário: 15/09/2026 10:21 (America/Sao_Paulo)

Responsável: Codex, em diagnóstico acompanhado pelo responsável do projeto.

Branch: `main`

Commit inicial de referência: `be31e1a`

### Objetivo da etapa

Registrar a linha de base do ciclo atual, confirmar o projeto analisado e identificar os maiores candidatos a consumo sem modificar código, banco ou configurações de produção.

### Escopo confirmado

- Organização: Barbearia.
- Projeto: `wabefmgfsatlusevxyfo`.
- Ambiente: `main`, marcado como produção.
- Plano: Free.
- Ciclo observado: 01/09/2026 a 01/10/2026.
- Período transcorrido no momento da leitura: 01/09/2026 a 15/09/2026, com o último dia ainda parcial.

### Comportamento preservado

Nenhuma regra, função ou configuração foi alterada. Foram realizadas somente leituras do painel, Observability, Query Performance e `cron.job`.

### Arquivos alterados nesta etapa

- Somente este documento recebeu o registro do diagnóstico.

### Banco ou migration alterados

Não. A única consulta executada com sucesso foi um `SELECT` somente leitura sobre `cron.job`.

### Medição de linha de base

- Egress não armazenado em cache: 1,501 GB de 5 GB, equivalente a 30% da franquia.
- Cached Egress: 0,325 GB de 5 GB, equivalente a 7% da franquia.
- Média simples aproximada do egress no período: 100 MB por dia.
- Média simples aproximada do Cached Egress no período: 22 MB por dia.
- Projeção linear até o fim do ciclo, se o padrão permanecer: aproximadamente 3,0 GB de egress e 0,65 GB de Cached Egress.
- Edge Function Invocations: 25.978 de 500.000, equivalente a 5%.
- Média aproximada de Edge Functions: 1.732 chamadas por dia.
- Realtime Messages: 218 de 2.000.000, abaixo de 1%.
- Realtime Concurrent Peak Connections: 9 de 200.
- Monthly Active Users: 67.
- Storage Image Transformations: indisponível no plano atual.
- Storage Size: 0,207 GB de 1 GB.
- Database Size no resumo: 0,209 GB de 0,5 GB.
- Database Size detalhado: 199,47 MB.
- Observability nas últimas 24 horas: 2.934 requisições PostgREST e 1.739 requisições de Edge Functions.
- Pico diário visual de egress no ciclo: próximo de 199 MB, observado por volta de 11/09.

### Diagnóstico de Realtime

Realtime não é atualmente o principal responsável pelo consumo. Foram registradas somente 218 mensagens no ciclo e pico de 9 conexões simultâneas. As notificações e atualizações necessárias não devem ser removidas com base nesses números.

### Diagnóstico de Edge Functions e Cron

Foram encontrados 10 Cron Jobs ativos:

- `generate-recurring-expenses-daily`: diariamente às 03:15 UTC.
- `inactive-client-whatsapp-daily`: diariamente às 17:00 UTC.
- `limpar-fila-whatsapp-diariamente`: diariamente às 03:00 UTC.
- `limpar-logs-relatorio-whatsapp-diariamente`: diariamente às 03:30 UTC.
- `referral-coupon-reminder-daily`: diariamente às 12:00 UTC.
- `sync-supabase-usage-daily`: diariamente à 01:00 UTC.
- `whatsapp-daily-report-every-10-minutes`: a cada 10 minutos.
- `whatsapp-overdue-barber-every-10-minutes`: a cada 10 minutos.
- `whatsapp-reminder-every-minute`: a cada minuto.
- `whatsapp-supply-alerts-daily`: diariamente às 11:30 UTC.

O relatório Query Performance acumulado mostrou:

- `invoke_whatsapp_reminder()`: 342.433 chamadas acumuladas.
- Consultas internas relacionadas ao WAL/Realtime: milhões de chamadas acumuladas, mas com tempo médio baixo.
- Operações de `net.http` e histórico do Cron: centenas de milhares de ocorrências acumuladas.

A rotina a cada minuto explica grande parte da média diária de aproximadamente 1.700 Edge Function Invocations. Entretanto, a contagem de chamadas não prova, isoladamente, que ela seja responsável pela maior quantidade de bytes de egress. Sua resposta e seus logs deverão ser medidos antes de qualquer ajuste.

### Diagnóstico complementar — notificações de agendamento

Leitura realizada em produção em 15/09/2026, sem atualização de registros:

- O gatilho `trigger_queue_whatsapp_on_appointment_created` está ativo e enfileira a confirmação quando um agendamento é criado com status `confirmed` ou `pending`, exceto agendamentos internos do tipo `api`.
- O gatilho `trigger_queue_whatsapp_on_appointment_updated` está ativo e enfileira mensagens quando o atendimento passa para `completed`, quando é cancelado ou quando data/horário são alterados.
- O lembrete de dez minutos é independente da fila. O Cron `whatsapp-reminder-every-minute` está ativo e chama `invoke_whatsapp_reminder()` a cada minuto.
- A função de lembrete seleciona apenas agendamentos do dia com status `confirmed` ou `pending`, `reminder_sent = false` e `booking_type <> 'api'`; depois calcula em memória a janela de dez minutos, com tolerância de um minuto.
- Após envio bem-sucedido, o lembrete grava `reminder_sent = true` com proteção contra corrida, evitando um segundo envio pela mesma rotina.
- Não existe Cron ativo para `whatsapp-process-queue`, apesar de a fila continuar recebendo confirmações, cancelamentos e conclusões.
- No momento da leitura havia 18 mensagens `created` pendentes, 4 `cancelled` pendentes, 1 `completed` pendente e 9 `inactive_client` pendentes. Também havia mensagens falhadas. Nenhuma delas foi reprocessada durante o diagnóstico.
- O painel do barbeiro também chama `whatsapp-notify` diretamente após concluir um atendimento. Como o gatilho do banco enfileira a mesma conclusão, ativar o processador sem remover ou tornar esse caminho idempotente pode produzir duplicidade.

Conclusão: o cálculo do lembrete de dez minutos está implementado e ativo. A confirmação imediata e a mensagem de conclusão são registradas no banco, mas a fila não possui processamento periódico ativo. A correção futura precisa ser orientada a eventos, idempotente e protegida contra o envio tardio do backlog existente.

Requisitos obrigatórios para a correção:

- Não disparar automaticamente mensagens históricas pendentes ou falhadas.
- Não enviar duas vezes confirmação, cancelamento, alteração ou conclusão.
- Preservar o lembrete de dez minutos e sua marcação `reminder_sent`.
- Processar somente notificações novas e elegíveis após o marco de ativação.
- Registrar tentativas e resultado de entrega por notificação.
- Manter uma forma de reprocessamento manual e individual, sem reenvio em massa.
- Validar em ambiente controlado os três eventos: criação, lembrete e conclusão.
- Somente depois dos testes remover o envio direto redundante da interface.

### Correção da fila publicada para teste controlado

Foi preparada uma correção local e reversível para validação antes de qualquer publicação:

- As chamadas originadas por criação e cancelamento agora informam o ID do agendamento e a ação correspondente.
- A conclusão deixa de enviar diretamente uma segunda mensagem e passa a solicitar somente o processamento do item `completed` criado pelo gatilho do banco.
- O processador aceita escopo por `appointmentId` e `action`, impedindo que uma ação nova consuma o backlog histórico.
- Chamadas legadas sem escopo ficam limitadas a itens criados nos últimos cinco minutos.
- Cada item é reservado por atualização condicional de `attempts` antes do envio, reduzindo o risco de duas execuções concorrentes enviarem a mesma mensagem.
- A consulta da fila deixa de usar `select('*')` e solicita somente as colunas necessárias.
- Nenhuma migration foi criada. Foram publicadas somente as Edge Functions `whatsapp-notify` e `whatsapp-process-queue`, após validação local.

Validações locais executadas:

- `npx tsc --noEmit`: aprovado.
- `git diff --check`: aprovado.
- `npm ci`: ambiente local reconstruído a partir do lockfile, sem mudança de versões declaradas.
- `npm run build`: aprovado; 3.905 módulos transformados e PWA gerada.
- `npm run lint`: aprovado.

Situação desta preparação: validação estática local aprovada. A regra da fila foi publicada, mas o teste de entrega ficou bloqueado pela indisponibilidade do servidor local Baileys; o frontend preparado ainda não foi publicado.

### Diagnóstico do transporte Baileys — 15/09/2026

- A operação usa um servidor local baseado em Baileys, não a Evolution API.
- O Baileys expõe endpoints compatíveis como `/message/sendText/:instancia` e `/instance/fetchInstances`.
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE_NAME` são nomes legados das variáveis já existentes; neste projeto elas apontam para o servidor/túnel do Baileys.
- Uma notificação isolada de teste foi reservada uma única vez, comprovando a proteção contra concorrência, mas o transporte respondeu `HTTP 502: Bad Gateway` e nenhuma entrega foi confirmada.
- A chamada somente de leitura para `/instance/fetchInstances` também retornou `502`, confirmando que a falha ocorre antes do envio e não é causada pela fila, pelo telefone ou pelo conteúdo da mensagem.
- Na máquina inspecionada não havia processo Node do Baileys, processo de túnel, serviço do Windows, tarefa agendada ou porta correspondente em escuta.
- Não repetir testes de envio enquanto o Baileys e sua URL pública não responderem. Primeiro validar a listagem da instância; depois executar apenas um teste pelo ID exato da fila.

Validação após restabelecimento do Baileys:

- `/instance/fetchInstances` respondeu `200 OK`; a instância `default` estava no estado `open`.
- O item isolado `4d3b1a8d-37b4-4ea0-b050-6d841a979387` foi processado com `processed = 1` e `failed = 0`.
- Uma segunda chamada usando exatamente o mesmo ID retornou `processed = 0`, confirmando que o item concluído não foi enviado novamente.
- Nenhum item do backlog histórico foi processado durante a validação.

### Diagnóstico do frontend

Pontos encontrados para etapas seguintes, sem alterações nesta etapa:

- Histórico CP combina Realtime com atualização automática a cada 10 segundos.
- A fila pública consulta novamente os dados a cada 30 segundos para visitantes sem acesso ao Realtime protegido.
- Alguns painéis recarregam consultas completas após qualquer evento de várias tabelas.
- Existem diversos canais Realtime; apesar disso, a medição atual mostra baixo volume de mensagens.
- Imagens transformadas dinamicamente não são suportadas pelo plano Free; as otimizações futuras deverão usar arquivos físicos menores e manter o original.

### Tentativa de detalhamento por arquivo

Foi executada uma consulta privada previamente salva chamada `Top Download Paths (200 Responses)`, mas ela depende da relação `storage_logs`, que não existe no banco do projeto. A consulta falhou sem realizar qualquer alteração. Não foram feitas novas tentativas repetitivas.

O detalhamento exato dos bytes por endpoint permanece como pendência de observabilidade. Essa ausência não impede a Etapa 2, pois o polling redundante do Histórico CP já foi confirmado diretamente no código.

### Problemas e riscos identificados

- A organização informa que o período de carência terminou em 31/05/2026 e que projetos podem ser restringidos ao esgotar a franquia.
- A frequência de Edge Functions é alta em relação à quantidade de usuários, principalmente devido ao lembrete executado a cada minuto.
- O Histórico CP realiza consultas frequentes mesmo sem mudança de dados.
- Transformações dinâmicas de imagem não devem ser usadas como base da otimização no plano atual.

### Rollback da etapa

Não aplicável ao sistema, pois não houve alteração operacional. Para desfazer apenas o registro, remover esta seção do documento.

### Situação final

Aprovada como diagnóstico somente leitura.

Próxima etapa autorizável: Etapa 2 — Histórico CP. Ela deve remover apenas o polling redundante de 10 segundos, preservar Realtime, atualização manual, paginação, filtros e todos os dados operacionais.

## Etapa 2 — Histórico CP

Executada localmente em 15/09/2026:

- Removido somente o `setInterval` que recarregava a aba visível a cada 10 segundos.
- Mantida a assinatura Realtime das tabelas `appointments`, `appointment_payments` e `product_sales`.
- Mantida a atualização ao voltar para a aba do navegador.
- Mantidos carregamento inicial, filtros, pesquisa, paginação e recargas após concluir, editar, excluir ou criar lançamentos.
- Nenhuma tabela, migration, valor, agendamento ou regra operacional foi alterada.

Validação da etapa:

- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.

Situação: alteração validada localmente e ainda não publicada no frontend. O ganho esperado nesta tela é eliminar até seis consultas completas por minuto enquanto o Histórico CP permanecer aberto e sem mudanças reais.

## Etapa 3 — Fila da Barbearia

Executada localmente em 15/09/2026:

- Mantido o Realtime de agendamentos para administradores, gestores e barbeiros.
- Aplicado debounce de 250 ms aos eventos Realtime para agrupar alterações próximas e evitar recargas concorrentes.
- O fallback de clientes e visitantes passou de 30 para 60 segundos.
- O fallback não executa consultas enquanto a página está oculta.
- Ao retornar para a página, a fila é atualizada imediatamente.
- A consulta interna de agendamentos deixou de usar `select('*')` e solicita somente os campos usados pela fila.
- As consultas de barbeiros e escalas mensais também passaram a solicitar apenas os campos utilizados.
- Mantidos agendamentos de hoje e futuros, encaixes, posições, pausas, disponibilidade, fotos e ações autorizadas.
- Nenhuma tabela, migration, valor, agendamento ou regra de disponibilidade foi alterada.

Validação da etapa:

- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.

Ganho estimado: redução mínima de 50% nas consultas periódicas da fila enquanto ela estiver visível para clientes/visitantes e redução de 100% dessas consultas enquanto a aba estiver em segundo plano. As respostas da equipe também ficam menores devido à seleção explícita de colunas.

Situação: alteração validada localmente e ainda não publicada no frontend.

## Etapa 4 — Canais Realtime

Executada localmente em 15/09/2026:

- Inventariados os canais Realtime usados nos painéis de cliente, barbeiro, financeiro, indicações, estoque, auditoria, alertas e Histórico CP.
- Confirmado que os canais críticos do cliente e do barbeiro usam filtros por `client_id`, `barber_id` ou chave de configuração quando o modelo permite.
- Confirmado que esses canais removem suas assinaturas no cleanup dos componentes.
- A Fila da Barbearia deixou de abrir o canal geral de `appointments` para clientes e visitantes, pois o RLS não permite que essa assinatura entregue a fila completa para esses perfis.
- Administradores, gestores e barbeiros continuam recebendo a fila por Realtime.
- Clientes e visitantes continuam atualizados pelo fallback público otimizado na Etapa 3.
- O canal individual `client-appointments-<user_id>` foi preservado; portanto, avisos de conclusão e cancelamento do próprio cliente continuam ativos.
- Não foram consolidados canais funcionais apenas para reduzir sua quantidade nominal, evitando risco desnecessário às notificações em produção.
- Nenhuma política RLS, tabela, migration, agendamento ou regra de negócio foi alterada.

Validação da etapa:

- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.

Ganho esperado: clientes e visitantes deixam de manter uma assinatura Realtime geral que não fornecia a fila completa, reduzindo conexões e tráfego sem retirar nenhuma fonte efetiva de atualização.

Situação: alteração validada localmente e ainda não publicada no frontend.

## Etapa 5 — Consultas e cache

Executada localmente em 15/09/2026 com escopo conservador:

- Confirmado que `site_config` já possui cache em memória de cinco minutos e que os horários de funcionamento já utilizam esse mecanismo.
- Não foi adicionado cache aos preços, serviços usados no agendamento, pagamentos, fila ou disponibilidade, evitando dados operacionais desatualizados.
- A vitrine de serviços deixou de consultar todas as colunas e passou a buscar apenas `id`, título, descrição, preço, ícone e imagem.
- A vitrine de barbeiros passou a buscar apenas `id`, nome, especialidade, avaliação e imagem.
- A loja passou a buscar apenas os campos de produto exibidos ou necessários ao carrinho e checkout.
- O telefone institucional da loja passou a reutilizar o mesmo cache de `footer_info` já usado pelo Navbar e Footer, evitando consultas duplicadas na mesma sessão.
- O editor administrativo agora invalida imediatamente o cache de cores, Hero e Footer após cada salvamento bem-sucedido.
- Nenhuma tabela, migration, preço, estoque, agendamento ou regra de checkout foi alterada.

Revisão React:

- Mantidos os carregamentos independentes existentes, sem criar dependências sequenciais adicionais.
- Não foram adicionados estados derivados, listeners globais ou novos efeitos.
- Os tipos públicos de serviços e produtos continuam cobrindo todos os campos renderizados.

Validação da etapa:

- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.

Ganho esperado: respostas menores nas páginas públicas e eliminação de leituras duplicadas de `footer_info` dentro da mesma sessão, sem risco de cache sobre dados transacionais.

Situação: alteração validada localmente e ainda não publicada no frontend.

## Etapa 6 — Storage e imagens

Executada localmente em 15/09/2026 sem modificar objetos existentes no Storage:

- Confirmado que uploads novos de serviços, produtos e barbeiros já criam arquivos físicos WebP de 400 e 800 px em paralelo.
- Confirmado que esses objetos usam nomes versionados e `cacheControl` de um ano.
- Removida a dependência frontend das transformações dinâmicas `/storage/v1/render/image/public/`, indisponíveis no plano atual.
- O resolvedor compartilhado agora seleciona diretamente `-w400` para miniaturas e `-w800` para cartões ou ampliações.
- URLs antigas que não possuem variantes físicas são mantidas exatamente como estão, sem tentativa de transformação e sem risco de imagem quebrada.
- Os painéis de cliente e barbeiro deixaram de manter implementações duplicadas do transformador e passaram a usar o resolvedor central.
- Fallbacks visuais existentes foram preservados.
- Nenhum arquivo original foi removido, renomeado, convertido ou sobrescrito nesta etapa.
- Nenhuma tabela, migration, foto registrada ou regra operacional foi alterada.

Revisão React:

- Removidas implementações duplicadas de resolução de imagem.
- Mantidos `loading="lazy"`, `decoding="async"`, dimensões e textos alternativos existentes.
- Nenhum novo efeito, estado ou listener foi criado.

Validação da etapa:

- Busca por `/storage/v1/render/image/public/` no frontend: nenhuma ocorrência operacional.
- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.

Ganho esperado: para imagens com variante física, uma única requisição ao arquivo WebP adequado substitui a tentativa de transformação seguida de fallback. Em imagens antigas, elimina-se a tentativa adicional que falhava antes de carregar o original.

Situação: alteração validada localmente e ainda não publicada no frontend.

## Etapa 7 — Edge Functions e automações

Executada localmente em 15/09/2026 com preservação integral dos agendamentos e notificações:

- Inventariadas as Edge Functions e rotinas Cron existentes no repositório.
- Mantido o Cron `whatsapp-reminder-every-minute` exatamente a cada minuto.
- Mantida a janela do lembrete em aproximadamente dez minutos, com tolerância de ±1 minuto.
- Mantidos os filtros por data, status, `reminder_sent` e exclusão de agendamentos internos `api`.
- Mantida a proteção que grava `reminder_sent = true` somente após envio bem-sucedido.
- A função `whatsapp-reminder` agora consulta primeiro os agendamentos elegíveis e encerra imediatamente quando não há nenhum na janela.
- Instância Baileys, localização e modelo da mensagem só são consultados quando existe um lembrete realmente elegível.
- Localização e modelo da mensagem passam a ser carregados em paralelo.
- Removidos logs rotineiros de execuções sem lembrete; erros e confirmações de envio permanecem registrados.
- Preservadas as melhorias anteriores da fila WhatsApp: processamento por ID/ação, bloqueio do backlog antigo e reserva condicional contra duplicidade.
- Nenhuma função foi removida ou desativada e nenhum Cron foi alterado.
- Nenhuma tabela, migration, valor ou agendamento foi alterado.

Validação da etapa:

- Revisão do fluxo confirmou que a consulta e o cálculo de elegibilidade permanecem iguais.
- `npx tsc --noEmit`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.
- `git diff --check`: aprovado.
- O runtime Deno não está instalado localmente; o empacotamento/publicação controlada foi feito pela API do Supabase após as validações locais.
- `whatsapp-reminder` foi publicado isoladamente em 15/09/2026 e confirmado como `ACTIVE`, versão 80, pelo inventário remoto de Edge Functions.

Ganho esperado: as 1.440 execuções diárias do lembrete deixam de fazer três leituras de configuração quando não há mensagem a enviar. No cenário sem lembretes elegíveis, isso evita até 4.320 leituras de `site_config` por dia, além dos logs rotineiros correspondentes, sem reduzir a precisão da notificação.

Situação: Edge Function publicada. O Cron, a janela de dez minutos, o banco e as demais funções não foram alterados nesta publicação. O frontend ainda depende do commit/push para entrar em produção.
