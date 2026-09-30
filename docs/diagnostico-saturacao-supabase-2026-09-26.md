# Diagnóstico de saturação e falhas de acesso — 26/09/2026

Projeto: `wabefmgfsatlusevxyfo` (Barbearia Raimundos).

Análise realizada com o MCP autenticado do projeto, logs remotos, leituras de catálogo do PostgreSQL, código local, histórico Git e JavaScript realmente servido em produção. Nenhum dado de cliente, segredo, senha ou token é reproduzido neste relatório.

## Conclusão sustentada pelas evidências

### 28/09/2026 — etapa 2: separação das pendências antes de commit/push

- Fonte: `git status`, diffs locais e dependências entre arquivos, sobre `origin/main` em `2d3e55f`. Nenhum arquivo foi colocado em stage, nenhum commit/push/deploy ou acesso de escrita ao Supabase foi feito nesta etapa.
- **Agendamento e redução de consultas (conjunto indivisível):** `src/App.tsx`, `src/lib/queryClient.ts`, `src/services/appointmentAvailability.ts` e seu teste, `Booking.tsx`, `QuickBookingDialog.tsx`, `BarbeiroDashboard.tsx` e `FilaDaBarbearia.tsx`. App e serviço compartilham o mesmo QueryClient; telas dependem dos novos métodos e da invalidação por operações/Realtime. Confirmações pedem leitura fresca, mas ainda é necessário teste local integrado de pausas, bloqueios, concorrência e contagem de chamadas antes de publicar.
- **Dashboard e banco (conjunto retido):** `ManagerDashboard.tsx`, `BarberProductivityDashboard.tsx`, `BarberRevenueAnalytics.tsx`, biblioteca/teste de projeção e três migrações `20260923182031`, `20260923191832`, `20260927013344`. A migração mensal invoca `preview_managerial_financial_closure` uma vez por mês elegível (até 12); ainda não há medida autenticada de latência/carga nem reconciliação completa das definições e do histórico de migrações no projeto remoto. Não incluir este conjunto num push automático de frontend antes dessas verificações.
- **Higiene de logs (independente):** as quatro Edge Functions locais `api`, `whatsapp-notify`, `whatsapp-process-queue` e `whatsapp-reminder` removem logs verbosos/sensíveis. Revisão do diff não encontrou mudança intencional na lógica de envio/autorização, mas cada função exige validação de diff/teste específico antes de deploy; Git push sozinho não comprova publicação das funções.
- **WhatsApp QR (UI isolada, correção incompleta):** `WhatsAppManager.tsx` renomeia o comando para “Gerar novo QR code” e impede cliques simultâneos na página. Não controla a regeneração automática pelo servidor Baileys local, cujo código não integra este conjunto. Não declarar o problema do QR resolvido com esse arquivo.
- **Registro de diagnóstico:** este documento acompanha as etapas e deve ser revisado quanto a evidências temporais antes do commit. Mantê-lo separado de mudanças funcionais evita que o histórico de investigação seja confundido com correção operacional.
- **Próximo passo:** começar pela validação isolada do conjunto de agendamento/carga, sem staging dos demais. Depois validar funções, QR e dashboard separadamente. Publicação depende de testes operacionais e confirmação da base/remoto correto; não há garantia de risco zero em produção.

### 28/09/2026 — etapa 3: validação local do conjunto de agendamento

- Fonte: revisão de `Booking`, `QuickBookingDialog`, serviço de disponibilidade, testes e migração de proteção de sobreposição já presente no repositório. Não houve consulta nem escrita no banco remoto; a presença da migração local não comprova, por si só, a definição atualmente ativa no Supabase.
- As consultas repetidas de horários/pausas/escala usam cache curto e invalidação após mudanças e eventos Realtime. Na confirmação, Booking força novas leituras de horários, pausas e escala; QuickBooking também força leituras de horários e pausas. Falha de leitura do serviço lança erro, em vez de transformar erro em agenda vazia.
- O código local da migração `20260913143535_allow_nonblocking_barber_fit.sql` usa lock transacional por barbeiro/data e trigger de sobreposição: encaixes locais podem coexistir; reservas comuns posteriores devem ser recusadas se conflitarem. É defesa no banco além da tela, mas não foi revalidada nesta etapa contra duas gravações simultâneas no projeto remoto.
- Testes locais: 51/51 em seis arquivos com ambiente Node; `appointmentAvailability.test.ts` cobre reaproveitamento, leitura fresca/invalidação e falha de pausas seguida de recuperação. ESLint nos oito arquivos do conjunto passou; build Vite/PWA concluiu. Primeira tentativa de Vitest sem `--environment node` não iniciou por ausência de `jsdom`; não foi falha de regra de agendamento.
- Limites: testes atuais não exercitam tela real, Realtime, pausa/bloqueio alterado durante o formulário, duas reservas concorrentes nem contagem de requisições em navegador. Build e lint não comprovam esses fluxos. Antes do push/publicação, fazer navegação local controlada e confirmar a proteção remota sem criar agendamentos reais.
- Estado: nenhum stage, commit, push ou deploy; nenhuma alteração de valores, agendamentos ou configurações do Supabase nesta validação.

### 28/09/2026 — etapa 4: smoke test isolado do frontend local

- Fonte: build já concluído servido por Vite preview em `127.0.0.1:4173`, sessão nova do agent-browser com rota de rede para o projeto Supabase bloqueada antes da navegação. Não reutilizou login nem gerou escritas ou consultas concluídas no projeto remoto.
- A página inicial abriu, exibiu conteúdo e controles de navegação (`Agendar`, `Entrar`, serviços) e não mostrou overlay de erro do Vite. A ferramenta de erros do navegador não reportou exceção de página nessa captura.
- Foram observadas tentativas iniciais de busca de `site_config`, `services` e `barbers`, como esperado para a tela inicial; a captura não identifica um ciclo de requisições de disponibilidade porque, com a rede bloqueada e sem dados de serviço/barbeiro, a etapa de horários não pôde ser alcançada.
- Limite: este é somente um smoke test de renderização. O trajeto simulado até o formulário e a estabilidade de dez segundos com dados controlados já constam de uma avaliação anterior neste documento; não repetimos o mesmo teste nem o apresentamos como validação de dados reais, conflito concorrente ou Realtime.
- Browser isolado e preview encerrados. Sem stage, commit, push ou deploy. Próximo passo útil antes de publicar o conjunto: ensaio controlado especificamente de alteração de pausa/agendamento durante a tela de horários, ou verificação read-only da definição ativa do trigger/RPC no banco correto quando a ferramenta de acesso estiver disponível.

### 28/09/2026 — etapa 5: invalidação de pausas e limite do Realtime

- Fonte: teste local do serviço de disponibilidade, revisão das assinaturas em Booking/QuickBookingDialog, busca nas migrações versionadas e documentação oficial Supabase Realtime Postgres Changes. Changelog consultado; nenhuma breaking change relevante à assinatura de Postgres Changes foi identificada nesta verificação.
- Adicionado teste que começa sem pausas, reutiliza a resposta em cache, invalida a chave de barbeiro/data e comprova que a leitura seguinte retorna a nova pausa 10:00–10:30. Quatro testes do serviço passaram; suíte completa: 52/52 em seis arquivos. ESLint do teste passou.
- A assinatura Realtime no código contempla `appointments`, `barber_breaks`, `barber_schedules` e `barbers`. A documentação Supabase exige que cada tabela esteja na publicação `supabase_realtime` para emitir Postgres Changes. Migrações locais comprovam `appointments` na publicação, mas não registram a inclusão das outras três tabelas. Elas podem ter sido habilitadas pelo painel; o estado remoto ainda não foi consultado. Portanto, não afirmar atualização imediata de pausa/escala em produção.
- Mesmo sem evento Realtime, a confirmação do agendamento relê pausas e horários com `fresh=true`; isso reduz risco de mostrar uma vaga desatualizada virar reserva indevida, mas não substitui o trigger de conflito no banco nem comprova concorrência real.
- Próximo passo: verificar de forma somente leitura a publicação ativa e o trigger no projeto correto antes de decidir entre depender dos eventos existentes ou adicionar mecanismo de atualização de baixo volume. Não habilitar publicação nem polling sem medir impacto em Realtime/egress no plano Free.
- Nenhum dado de produção, migração, deploy, commit ou push alterado.

### 28/09/2026 — tentativa de leitura do catálogo remoto via CLI

- Fonte: `codex mcp list` confirmou `supabase-barbearia` habilitado para `wabefmgfsatlusevxyfo`, mas as ferramentas SQL desse MCP não estão expostas nesta sessão. `npx supabase projects list --output json` confirmou autenticação do CLI, projeto correto vinculado e `ACTIVE_HEALTHY` naquele instante.
- Tentativa única de `npx supabase db query --linked` com SELECT restrito em `pg_catalog.pg_publication_tables` para `appointments`, `barber_breaks`, `barber_schedules` e `barbers`. O comando permaneceu em `Initialising login role...` sem linhas nem erro por cerca de 40 segundos e foi interrompido. Resultado **inconclusivo**; não interpretar como tabela ausente ou presente.
- O trigger ativo também não foi consultado, pois o caminho de SQL remoto não respondeu. Nenhuma escrita, migração ou mudança de configuração foi feita. Não repetir em loop; alternativa é consultar o catálogo pelo SQL Editor autenticado ou disponibilizar a ferramenta MCP `execute_sql` nesta sessão.

### 28/09/2026 — definição ativa do trigger enviada pelo usuário

- Fonte: resultado JSON da segunda consulta de catálogo executada pelo usuário no SQL Editor do projeto `wabefmgfsatlusevxyfo`; não é resultado do CLI desta sessão. A primeira consulta, de `pg_publication_tables`, ainda não foi fornecida.
- `trg_prevent_overlapping_barber_appointments` consta com `tgenabled = O` (habilitado) e atua antes de INSERT ou UPDATE dos campos de agenda e `is_fit`. A função retornada corresponde estruturalmente à migração local `20260913143535_allow_nonblocking_barber_fit.sql`: lock transacional por barbeiro/data; encaixe local autorizado à equipe pode sobrepor; agendamento comum conflitante com pendente/confirmado gera `23P01`; cancelado/concluído não ocupa o intervalo na verificação.
- Essa definição é evidência da proteção no banco no instante da consulta, inclusive do mecanismo de serialização usado para concorrência. Não equivale a um ensaio de duas transações simultâneas nem confirma funcionamento da atualização da tela por Realtime.
- Pendência objetiva: resultado da consulta da publicação `supabase_realtime` para `appointments`, `barber_breaks`, `barber_schedules` e `barbers`. Nenhuma alteração de banco/código foi realizada para esta verificação.

### 28/09/2026 — publicação Realtime ativa confirmada

- Fonte: resultado da consulta `pg_catalog.pg_publication_tables` executada pelo usuário no SQL Editor do projeto correto e enviado como JSON. Entre as quatro tabelas filtradas, retornou **apenas `appointments`**.
- Conclusão: assinaturas `postgres_changes` para `barber_breaks`, `barber_schedules` e `barbers` no frontend não recebem alterações dessas tabelas na configuração atual. O cache dessas informações ainda expira/recarrega em leituras futuras e as verificações finais usam leitura fresca, mas a tela aberta não tem atualização imediata confiável para mudança externa de pausa/escala.
- A segurança contra duplicidade permanece apoiada no trigger ativo, confirmado separadamente; Realtime é mecanismo de atualização visual, não proteção transacional. Não inferir que um slot mostrado na tela continua disponível até concluir a gravação.
- Decisão de baixo risco para o plano Free: não adicionar as três tabelas à publicação nem introduzir polling contínuo sem avaliação de RLS, volume e custo. Próxima etapa local é revisar/reforçar atualização sob demanda ao voltar à aba ou selecionar horário e remover dependência aparente de eventos não publicados; manter validação fresca e trigger.
- Nenhuma configuração, dado, migração, deploy, commit ou push foi alterado nesta consulta.

### 28/09/2026 — atualização local sob demanda, sem ampliar Realtime

- Fonte: mudança local em `Booking.tsx` e `QuickBookingDialog.tsx`, motivada pela publicação remota confirmada com apenas `appointments`. Changelog Supabase e documentação de Postgres Changes consultados; nenhuma funcionalidade nova de banco foi usada.
- As duas telas agora exibem botão “Atualizar horários”. Quando o usuário retorna à aba/janela enquanto escolhe horário, uma revalidação ocorre somente se passaram ao menos 15 segundos desde a entrada nessa etapa ou última revalidação por foco. Não há polling contínuo.
- Booking invalida horários ocupados, pausas, escala diária e disponibilidade semanal para o barbeiro/data selecionados antes de recarregar; a leitura semanal atual passa também o almoço retornado pelo servidor ao cálculo. QuickBooking invalida horários ocupados, pausas e disponibilidade semanal; o cálculo prefere o valor semanal atual lido do servidor, com fallback ao barbeiro já carregado se a leitura falhar. Assinaturas de `barber_breaks`, `barber_schedules` e `barbers` foram retiradas das duas telas por não estarem na publicação ativa; `appointments` permanece assinado. As verificações frescas na confirmação e o trigger ativo não foram alterados.
- Limite: QuickBooking ainda não consulta `barber_schedules` mensal ao recarregar; o botão não deve ser anunciado como garantia de escala mensal atualizada nesse diálogo. O fluxo de agendamento público consulta essa escala. Teste com mudança externa real de escala/pausa ainda é necessário.
- Verificações locais: ESLint nos dois componentes, TypeScript `--noEmit`, 52 testes em seis arquivos e build Vite/PWA passaram após o ajuste final. Naquele momento, o ensaio visual com dados controlados ainda estava pendente; seu resultado consta na seção seguinte. Nenhum registro ou configuração de produção alterado; sem commit, push ou deploy.

### 28/09/2026 — ensaio visual isolado da atualização de horários

- Fonte: build local no Vite preview, navegador isolado e interceptação de todas as chamadas ao host Supabase do projeto. Serviço, barbeiro, horários e pausa eram dados fictícios em memória; nenhum agendamento foi confirmado e nenhuma chamada ao projeto real foi concluída.
- Fluxo: serviço fictício → barbeiro fictício → seleção de horário em 28/09. O botão “Atualizar horários” apareceu na etapa correta. Antes da pausa simulada, 10:00 estava disponível. Após ativar uma pausa fictícia 10:00–10:30 e clicar no botão, 10:00 desapareceu; `barber_breaks` e `get_barber_busy_slots` tiveram uma nova leitura cada (2 → 3 no contador cumulativo do trajeto).
- O evento de foco após pelo menos 15 segundos produziu revalidação; dois eventos de foco disparados em sequência na mesma avaliação não acrescentaram leituras. A automação de navegador pode ela própria alterar o foco entre comandos, de modo que contagens de comandos separados não demonstram isoladamente um limite rígido de uma chamada por ação do usuário.
- A ferramenta não reportou exceções de página nesse cenário. Esta evidência cobre a tela pública com pausa simulada, não o QuickBooking, a escala mensal real, eventos Realtime reais, concorrência transacional ou o desempenho do Supabase em produção.
- Sem deploy, commit, push, migração ou escrita remota. Próximo passo: validar separadamente o QuickBooking com dados controlados e revisar a limitação da escala mensal antes de liberar o conjunto de agendamento.

### 28/09/2026 — alinhamento local do agendamento rápido à escala mensal

- Fonte: comparação estática de `QuickBookingDialog.tsx` com `Booking.tsx` e serviço `appointmentAvailability.ts`. A tela rápida lia pausas/agenda ocupada e disponibilidade semanal, mas não consultava `barber_schedules`; depois da leitura semanal atualizada, ainda calculava abertura/fechamento com a cópia inicial do barbeiro. A confirmação também ignorava a escala datada.
- Correção local: um resolvedor da tela consulta primeiro a escala mensal já existente; se não houver registro, usa a disponibilidade semanal atual e, por último, o horário da loja. A escala mensal fornece fechamento, abertura, almoço e pausa. O mesmo resolvedor é relido na confirmação, antes de qualquer escrita, e rejeita horário fora do expediente; o botão de atualização invalida também a escala mensal. Não foram criadas tabelas, RPCs, Realtime adicional nem polling.
- Verificação: TypeScript e ESLint do componente passaram; 52/52 testes existentes passaram; build Vite/PWA concluído. `npm test` não existe no projeto, por isso a suíte foi executada com `npx vitest run --environment node`. O changelog atual do Supabase foi consultado; não há mudança de API relevante para esta leitura REST.
- Limite: os testes existentes não cobrem diretamente o resolvedor da tela, nem houve ensaio visual do QuickBooking com mudança simulada de escala nesta etapa. Falha na leitura da escala mantém o fallback já usado no fluxo público; isso não prova que uma escala excepcional será respeitada durante indisponibilidade do banco. A proteção transacional de conflito continua no trigger remoto confirmado anteriormente.
- Estado: somente arquivos locais alterados; nenhum agendamento, dado financeiro, configuração remota, deploy, commit ou push. Próximo passo: ensaio isolado do QuickBooking e revisão do diff operacional antes de qualquer publicação.

### 28/09/2026 — teste controlado da escala mensal no agendamento rápido

- Fonte: `QuickBookingDialog` em servidor Vite local, com Auth sem sessão e todas as chamadas ao host Supabase do projeto interceptadas por resposta fictícia; rota de rede também bloqueada como proteção adicional. Arquivos temporários do ensaio foram removidos após fechar navegador e servidor.
- Cenário: serviço/barbeiro fictícios, 29/09/2026, escala mensal 09:00–17:00 com pausa 10:00–10:30 e almoço 12:00–13:00. A tela desabilitou 10:00, 12:00 e 12:30. Após alterar a resposta simulada para dia fechado e clicar “Atualizar horários”, mostrou “Nenhum horário disponível”. Após reabrir e retirar a pausa, 10:00 voltou a ficar selecionável e o almoço permaneceu excluído.
- A leitura de `barber_schedules` ocorreu na entrada da etapa e após cada atualização manual (contador cumulativo 1→2→3); não houve chamada a `appointments`, confirmação, gravação ou erro de página no navegador. Quatro testes novos cobrem a prioridade mensal, fechamento, almoço/pausa e fallback; suíte total 56/56, TypeScript, ESLint e build Vite/PWA passaram.
- Limite: o ensaio não executou confirmação nem validação de concorrência, pois isso poderia escrever dados se o isolamento falhasse. Não demonstra comportamento com sessão real, RLS real ou indisponibilidade de banco. A lista de horários ainda parte da grade de horários da loja; uma escala mensal que comece antes da loja pode não exibir horários extras, ponto para decisão de negócio antes de alterar regra de atendimento.
- Nenhum deploy, commit, push ou alteração remota. Próximo passo: revisar o diff completo do conjunto operacional, separá-lo das mudanças financeiras/WhatsApp e decidir sobre publicação após teste final.

### 28/09/2026 — revisão e staging seletivo do conjunto de agendamento

- Fonte: diff contra `origin/main` e estado Git local. Revisados `App`, `Booking`, `QuickBookingDialog`, serviço/cache de disponibilidade, fila e dashboard do barbeiro. `App` usa a instância única do QueryClient do serviço; os componentes e testes relacionados precisam permanecer juntos.
- Foi corrigida uma apresentação incorreta no agendamento rápido: após escolher o serviço, a primeira carga de horários agora recebe explicitamente seu ID, sem depender do estado React ainda não atualizado. A confirmação já verificava duração/conflitos; a mudança evita oferecer na lista um início que não comporta o serviço selecionado.
- Verificações após a correção: TypeScript, ESLint dos dez arquivos, 56/56 testes, build Vite/PWA e `git diff --cached --check` passaram. O changelog Supabase foi consultado; nada nesta etapa depende de funcionalidade nova da plataforma.
- Exatamente dez arquivos de agendamento/cache/testes foram colocados em stage, com 498 inserções e 204 remoções. Dashboard financeiro, migrações, Edge Functions, UI do WhatsApp e este diagnóstico ficaram fora do stage. Não há commit, push nem deploy.
- Limites de publicação: teste com dados reais/autenticação e acompanhamento de erros/consumo só podem ocorrer após publicar. O QuickBooking ainda inicia sua grade pelo horário da loja; escala mensal que comece antes da loja não mostrará horários extras. Não ampliar essa regra de negócio sem decisão explícita. O fallback semanal em falha de leitura mensal também merece revisão de política antes de afirmar garantia de escala excepcional sob indisponibilidade.
- Próximo passo: decidir a política para escala excepcional em falha de leitura e para horário mensal fora da grade da loja, depois efetuar revisão final do stage antes de commit/publicação isolada. Produção permanece inalterada.

### Reconciliação Git local antes do push

- Checkout local estava em 6d7841d, quatro commits atrás de origin/main 2d3e55f, sem arquivos staged. Cópias locais de AuthContext/useOperatingHours/siteConfigCache já continham o hotfix remoto; quatro arquivos de agendamento ainda têm alterações próprias sobre a base.
- Criada referência recuperável codex/backup-before-reconcile-20260928 em 6d7841d. Avançado ponteiro main/index para origin/main com reset --mixed, preservando arquivos de trabalho. Após a operação HEAD=origin/main, 0/0 commits divergentes, alterações locais continuam não staged.
- Verificação: 51 testes em seis arquivos passaram. Não houve commit, push, deploy ou mudança remota. Arquivo de trava .git/packed-refs.lock datado de agosto foi identificado sem processo Git ativo; remoção exata e verificação constam da etapa de manutenção local.
- Próximo passo: classificar alterações locais por assunto e revisar diferenças finais antes de staging seletivo; migrações/Edge Functions continuam pendentes de validação separada.

### Acesso Supabase confirmado — 28/09/2026

- Sessão do navegador Codex abriu o projeto correto `wabefmgfsatlusevxyfo` na organização Barbearia Free (`uzfkotnafmtzmsaidlnb`); projeto exibiu Healthy. Janela de 60 minutos no Overview, aproximadamente 07:45–08:44 BRT, mostrou 641 requisições e 98,8% de sucesso; CPU 3%, RAM 52%, 14/60 conexões no instante exibido. São indicadores pontuais, não garantia contínua.
- Query Performance do projeto abriu, porém filtros por get_managerial_monthly_financial_summary e preview_managerial_financial_closure retornaram No queries detected no relatório pg_stat_statements. Isso não mede custo da RPC: execução interna/plpgsql pode não aparecer pelo nome e o filtro pode não corresponder ao texto normalizado.
- Não foi executada a RPC financeira, EXPLAIN ANALYZE, alteração de banco, deploy ou configuração. Próxima medição deve usar uma chamada controlada autenticada e observar latência/CPU antes de liberar o dashboard, respeitando o Free.

### Próxima revisão — carga do dashboard e Realtime

- Leitura estática da RPC mensal local: chama preview_managerial_financial_closure para cada mês concluído do ano (até 12). A preview oficial faz agregações de serviços, pagamentos, vendas, despesas e insumos; não foi trocada por cálculo alternativo para preservar regras de comissão e lucro.
- MCP do projeto não está disponível nesta sessão; não foram obtidos EXPLAIN/ANALYZE ou duração real. Custo da RPC permanece pendente e não pode ser classificado como seguro para produção apenas pelo código. Nenhuma consulta ou escrita remota foi realizada.
- A aba produtividade reagia imediatamente a eventos de cinco tabelas com recarga completa; agora agrupa eventos próximos em 350 ms e remove o timer ao sair da aba. Canais e atualização continuam ativos; esta alteração local não altera lógica financeira nem eventos gravados.
- Verificação local: 51 testes passaram em seis arquivos e build Vite concluiu. Sem medição de tráfego em navegador e sem deploy, commit ou push. Próximo passo: medir a RPC com consulta limitada e validar visualmente filtros/Realtime antes de publicar o conjunto.

### Projeção por barbeiro — visão geral reconciliada

- Análise local encontrou taxa única misturada da equipe na projeção, que fazia Todos divergir da soma dos barbeiros quando suas receitas por hora produtiva eram diferentes.
- Correção local: calcular taxa de cada barbeiro no período selecionado e somar oportunidades por barbeiro e faixa de tempo. Minutos ociosos de barbeiro sem serviços concluídos não recebem taxa emprestada; interface sinaliza quando o potencial é parcial.
- Testes de taxas diferentes e falta de histórico passaram; total 51 testes em seis arquivos. Nenhum registro, preço, comissão ou regra de agendamento alterado. Ainda não aplicado/publicado.

### Continuidade dashboard — falha financeira não é faturamento zero

- Revisão local ManagerDashboard confirmou que financialError mostrava aviso sem ocultar cartões, gráfico e composição; consulta malsucedida podia conservar valores do ano anterior ou exibir defaults zero.
- Correção local: limpar série ao iniciar consulta, ocultar resultados quando financialError e proteger respostas por versão. Cleanup invalida consulta antiga ao mudar ano/desmontar; catch/finally antigos não substituem resultado nem loading atual.
- Verificação: 50 testes existentes passaram em seis arquivos e build Vite/PWA terminou com sucesso. Testes existentes não cobrem interação específica de troca rápida de ano; validação de navegador permanece pendente.
- Nenhuma consulta remota, migração, escrita financeira, deploy, commit ou push nesta etapa. Baileys continua separado e depende do código local para concluir controle de QR. Próximos itens: projeção geral versus soma individual, validação visual e revisão isolada do conjunto de publicação.

### Falha ao enviar relatório — causa confirmada nos logs

- Consulta somente de leitura de whatsapp_report_logs status error retornou vazio; ausência nessa tabela não prova sucesso. A implementação publicada diverge do arquivo local, conforme fluxo/linhas da stack, sem comparação integral ainda.
- Logs MCP consultados na janela 27/09 02:00–02:29:45 UTC. Às 02:10:05 e 02:20:04 UTC (23:10 e 23:20 BRT), whatsapp-daily-report recebeu HTTP 400 do servidor de envio com mensagem WhatsApp não está conectado; propagou HTTP 500. Às 02:00:11 UTC houve HTTP 502 do host via Cloudflare.
- Conclusão: falhas observadas na etapa sendEvolutionMessage, nome legado do adaptador; não demonstra uso de Evolution em vez de Baileys. Servidor alcançável nas duas chamadas recentes, mas sessão WhatsApp desconectada. Não são erros de comissão demonstrados por essa evidência.
- Não é possível correlacionar exatamente o clique da imagem sem horário absoluto; logs confirmam a mesma função falhando no período recente. Nenhum envio de teste ou alteração de configurações realizado pelo agente.
- Próximo passo: parear sessão Baileys e confirmar connected true / status conectado; depois executar um teste manual. Ajustar mensagem genérica da interface é melhoria separada, não resolve sessão desconectada.

### QR WhatsApp — solicitação manual

- Leitura de WhatsAppManager e whatsappConnectionService: página sem polling automático; getStatus inicial usa estado local no modo manual. connect é acionado pelo botão; faz create com qrcode true e depois get-qrcode. Não foi comprovado se servidor renova por timer ou se essas duas chamadas geram códigos diferentes.
- Código do servidor Baileys não encontrado neste repositório; documentação descreve index.js na máquina dedicada. Renovação automática não pode ser corrigida integralmente apenas ocultando QR na página.
- Ajuste local: rótulos Gerar novo QR code, orientação de renovação manual e trava síncrona contra cliques simultâneos durante pedido. Build Vite concluído. Sem deploy e sem alteração do servidor, sessão ou notificações.
- Próximo passo: obter index.js do Baileys (sem env, tokens, credenciais ou QR), especialmente conexão, timers e endpoints create/connect. Separar reconexão de sessão autenticada da abertura de pareamento; controlar expiração sem interromper mensagens conectadas.

### Correção analítica local — união de intervalos

- Execução somente de leitura da consulta corrigida para 25/09: três linhas, receita R$ 545,00, capacidade 1.380 minutos, ocupação 782 e produção 540. Invariantes passaram: produção <= ocupação <= capacidade e ociosidade = capacidade - ocupação. Dados agregados, sem nomes/clientes; não comprova todos os períodos nem acesso via papel da aplicação.
- Interface local recebeu proteção por versão de consulta: resposta de filtro anterior não substitui a seleção atual e resposta após desmontagem é ignorada. Ainda precisa de teste de interação no navegador.

- Nova migração 20260927013344_fix_revenue_occupancy_interval_union criada pelo CLI. Une intervalos de agendamentos e recorta ocupação ao expediente disponível após pausas/bloqueios. Não altera registros de agendamentos nem a soma de receita dos concluídos; mantém assinatura, guardas e privilégios da função local.
- Testes SQL sintéticos somente de leitura: dois atendimentos simultâneos de 30 minutos contam 30; atendimento atravessando pausa conta somente 60 minutos disponíveis; atendimento parcialmente fora do expediente conta somente 30. Todos passaram.
- EXPLAIN sem ANALYZE da consulta completa para 25/09/2026 confirmou sintaxe/tipos e uso do índice de data de appointments. Não mede duração real nem valida custo anual.
- Primeira tentativa de resumo agregado falhou por falta de aliases nos campos round da consulta extraída. Erro do wrapper de diagnóstico, não da função; wrapper corrigido com nomes explícitos no CTE. Nenhuma escrita executada.
- Migração ainda não aplicada em produção. Pendentes: equivalência da definição remota, testes adicionais e revisão de concorrência dos filtros antes de publicar o conjunto do dashboard.

### Revisão dashboard pendente — cálculo e acesso

- Catálogo remoto confirma existência das duas RPCs get_barber_revenue_evolution/get_managerial_monthly_financial_summary, ambas security invoker e grants postgres/authenticated/service_role, sem PUBLIC/anon. Não reaplicadas migrações. Guardas de papel encontradas nos arquivos locais; equivalência integral da definição remota ainda não conferida.
- RPC de evolução local soma services.duration por agendamento sem união de intervalos nem interseção com expediente disponível. Encaixes simultâneos podem contar ocupação duas vezes; agendamento fora do expediente/pausas pode reduzir indevidamente tempo ocioso. Necessária correção analítica antes de publicação, sem alterar agendamentos.
- RPC mensal chama preview do fechamento até 12 vezes; custo deve ser medido antes de disponibilizar painel. Não executado teste pesado no banco recuperado.
- Correção local inicial BarberRevenueAnalytics: limpar resultados ao iniciar filtro/consulta e ocultar indicadores quando ocorrer erro, com aviso explícito. Concorrência de respostas de filtros ainda requer proteção/teste. Nenhuma RPC remota ou função financeira modificada.

### Revisão das alterações pendentes — testes locais

- Comparação com origin/main 2d3e55f, preservando hotfix publicado e demais arquivos locais. Identificado cache de getBarberBreaks que retornava error como resultado concluído; alterado localmente para rejeitar erro, evitando reutilização de falha como resposta bem-sucedida por 15 segundos.
- Teste novo simula timeout seguido por leitura válida de pausa e confirma segunda chamada remota. Total 50 testes em seis arquivos passaram. Confirmações Booking/QuickBooking ainda chamam leituras fresh; revisão integral de fallback/concorrência e migrações permanece pendente.
- Build Vite concluído; avisos de tamanho de bundle, Browserslist antigo e import misto storage não foram tratados como causa do incidente. Não realizado novo commit/push/deploy, nem mudança no banco ou nas funções WhatsApp nesta etapa.

### Relatório local Baileys fornecido — 21h32–21h36 BRT

- Export do Bot Manager com 84 entradas. Apesar do cabeçalho Frontend Only, contém saída capturada do bot e zrok; não substitui logs da Edge Function nem métricas PostgreSQL. Resumo Erros=0 é classificação da interface: há erro explícito em categoria CLOUDFLARE e fechamento em BOT.
- Túnel real zrok: 21h32m46 unable to create proxy backend/no apiSession; tentativa de autenticação por certificado no controlador NetFoundry expirou aguardando headers. Comprova falha desta inicialização do túnel, não prova certificado inválido nem origem DNS/firewall/rede. Interface anunciou URL fixa/sucesso antes desse erro, portanto sucesso de lançamento não demonstra acessibilidade pública.
- Bot local iniciou porta 8888 às 21h32m41. Health repetido status=ok, connected=false, identidade do socket null; sessionExists=true não comprova sessão WhatsApp autenticada.
- QR gerado repetidamente e não concluiu pareamento nesta janela. 21h35m22 QR refs attempts ended/statusCode408; reconexão agendada após três segundos, novo QR às 21h35m26. Não existe connection=open ou connected=true no material.
- Dois impedimentos distintos: túnel público não estabelecido nessa tentativa e sessão WhatsApp não autenticada. Não atribuir à CPU Supabase nem trocar segredo de URL sem validar endereço público.
- Relatório possui material de pareamento/QR; não reproduzido neste diagnóstico. Próximo passo no computador dedicado: verificar health local, conectividade do zrok/controlador e saúde pública; depois parear QR atual e confirmar connected=true. Não apagar credenciais/session nem enviar mensagens em lote. Export contém timestamps zrok com aparente diferença de três horas; usar sequência/horário do Manager, sem correlacionar como UTC exato automaticamente.
- Usuário também confirmou acesso aos três perfis (admin/cliente/barbeiro); validação funcional relatada, não executada pelo agente.

### Duas janelas fechadas pós-recuperação — 21h23 BRT

- Coleta 00:23:18Z ou posterior; janela de logs fechada 00:13–00:23Z. Auth/REST: 105 eventos/zero 5xx entre 00:13–00:18 e 93/zero entre 00:18–00:23. Total 198/zero. Evidência de recuperação nessas duas janelas, não garantia permanente; abrangência Auth+REST não é exatamente o conjunto interno do advisor Data API.
- Delta pg_stat_statements vs baseline 21h15: timezone_names continua nove chamadas/9.538,99 ms; catálogo recursivo nove/3.123,96 ms; update cron uma/2.146,77 ms. Nenhum crescimento dessas três consultas.
- Realtime WAL de 239/1.808,51 ms para 1.009/6.782,65 ms: +770 chamadas/+4.974,14 ms total. Limpeza HTTP de três/0,123192 ms para 25/23,13 ms: +22 chamadas/~23,01 ms. Não indicam nesta janela repetição da limpeza historicamente lenta; manter Realtime/cron sem alteração.
- SQL MCP respondeu rapidamente (~2 s incluindo transporte). Nenhuma escrita, reinício adicional ou modificação de permissões/dados. Validação de perfis e entrega efetiva de notificações ainda pendente.

### Continuidade — 21h15 BRT

- Gateway pós-recuperação: minuto 00:13Z 70 eventos Auth/REST/zero 5xx, 00:14Z três/zero, 00:15Z um/zero. Último minuto parcial, coleta 00:15:28Z. Fim solicitado 00:17Z ainda futuro; não apresentar janela como completa. Ainda não existem duas janelas completas de cinco minutos desde 00:13Z.
- Novo baseline pg_stat_statements: timezone_names nove chamadas/9.538,99 ms total; catálogo recursivo nove/3.123,96 ms; atualização interna cron.job_run_details uma/2.146,77 ms; Realtime WAL 239/1.808,51 ms. Outras leituras catálogo <1.411 ms total. SQL MCP respondeu ~1,3 s. Não atribuir CPU sustentada exclusivamente a esses acumulados curtos; snapshot é baseline para delta futuro, não motivo para desligar Realtime/cron nem mexer em catálogo.
- Nenhuma escrita ou nova mudança de produção nesta etapa. Próxima coleta útil após 00:23Z para duas janelas pós-recuperação fechadas, acompanhada de delta das consultas se necessário. Evitar polling rápido.

### Validação informada pelo usuário — pós-reinício

- Usuário relatou que conseguiu efetuar login. Perfil usado e horário exato não informados. Confirma um teste de acesso bem-sucedido, não os três perfis nem estabilidade prolongada.
- Continuidade autorizada para verificar recuperação. Não gerar agendamentos, envios de WhatsApp ou alterações financeiras apenas para teste sem definir cenário.
- Logs 00:13Z até coleta aproximadamente 00:14:16Z: auth/token dois HTTP 200 e auth/user dois 200. Leituras appointments treze 200, profiles nove 200, user_roles seis 200, services quatro 200, productivity RPC quatro 200 e forecast dois 200. Confirma autenticação e leituras de produção nessa janela. Consulta inicial tinha fim solicitado 00:16Z, ainda futuro; resultados são parciais até coleta. Agrupamento limitado aos 20 maiores não exclui erros em grupos menores; consulta agregada separada mede 5xx totais.
- Agregado Auth/REST com janela fechada 00:13–00:14:16Z: 71 eventos, zero 5xx. É recuperação observada por 76 segundos, não comprovação de estabilidade de longo prazo, entrega de notificações ou disponibilidade correta de todos os perfis.

### Pós-reinício — 21h12–21h13 BRT

- Screenshot enviado pelo usuário: Healthy, CPU 99%, 15/60 conexões, Data API 100% de 11 requisições falhando. Indicador CPU pode refletir amostra anterior; janela de 60 minutos inclui período pré-reinício.
- SQL pg_stat_activity em 00:12:47Z respondeu em ~1,5 s MCP: nenhum client backend ativo na captura, workers em espera, incluindo pg_net 0.19.5 Extension/Extension. Não prova ausência de picos entre amostras.
- pg_stat_statements de http_response após reinício: insert uma chamada/0,842896 ms; limpeza três chamadas/0,123192 ms total. Estatísticas não comparáveis ao acumulado anterior sem período/reset; não extrapolar redução mensal.
- Catálogo: net._http_response agora 49.152 bytes (antes ~118,87 MB); fila HTTP 24.576 bytes, estimativa dois registros; cron.job_run_details permanece 65.994.752 bytes. Estatísticas de linhas cron/response zeradas e autovacuum null, não significam tabelas vazias. Nenhum TRUNCATE/DELETE/VACUUM foi executado pelo agente.
- Logs Gateway 00:10–00:13Z: site_config oito 200, seis 521, três 503; auth/token três 502 e um 504; services um 200; barbers um 200, um 502, um 503; appointments um 200. Janela cobre a transição/reinício; retornos 200 demonstram leituras reais, mas Auth ainda falhou e nenhuma autenticação bem-sucedida foi comprovada.
- Próximo passo: separar as requisições estritamente posteriores à conclusão do reinício e testar autenticação; não realizar novo reinício nem mexer em cron/dados com base somente no tamanho das tabelas.
- Catálogo adicional: _http_response e http_request_queue têm relpersistence=u (unlogged). A redução do tamanho após reinício está confirmada, mas não foi validada entrega de mensagens que estivessem pendentes; não afirmar ausência de impacto nas filas HTTP. pg_stat_database.stats_reset retornou null após reinício; estatísticas anteriores não devem ser comparadas diretamente.

### Reinício autorizado — aproximadamente 21h08 BRT de 26/09

- Usuário autorizou explicitamente o reinício. Projeto conferido no painel: wabefmgfsatlusevxyfo, sa-east-1, organização Barbearia FREE.
- Botões acionados por mouse não abriram diálogo; uma recarga da página e acionamento por teclado abriu a confirmação oficial. Nenhuma alteração de plano/configuração, pausa ou exclusão acionada.
- Confirmação Restart executada uma única vez. Painel exibiu Restarting e redirecionou ao overview com aviso de indisponibilidade temporária. Isso confirma início, não conclusão nem recuperação de login.
- Aguardando conclusão antes de consultar o banco; nenhuma escrita SQL realizada.
- Pós-reinício: overview voltou a carregar; probe SQL retornou connection_ok=1 em 27/09 00:08:29Z (26/09 21h08m29 BRT). Chamada MCP ~1,7 s incluindo transporte, contra timeout anterior ~15,5 s. Confirma recuperação da conexão neste instante, não estabilidade prolongada nem autenticação das três funções.
- Correção de estado visual: após carregar, overview ainda mostra Restarting; não tratar carregamento intermediário como conclusão do reinício. Consulta pg_stat_activity respondeu (~11,3 s incluindo transporte): 12 client backends idle/ClientRead; checkpointer CheckpointerMain, bgwriter BgwriterHibernate, cron Extension, autovacuum AutovacuumMain, archiver ArchiveCommand, walwriter WalWriterMain, logical launcher LogicalLauncherMain, um pg_net 0.19.5 sem wait_event. Não há prova de consumo CPU por pg_net nem de conclusão da recuperação; SQL voltou a ser acessível durante a transição.

Atualização de continuidade: a mitigação isolada de chamadas repetidas foi publicada no commit `2d3e55f` e o deploy Vercel está Ready. As descrições do bundle antigo abaixo são evidências históricas, não o estado posterior à publicação. Recuperação de login/banco ainda não comprovada.

### Continuidade — 26/09, aproximadamente 21h04–21h07 BRT

- Consulta de processos imediatamente anterior: agrupamento de pg_stat_activity por backend/application/state/espera falhou por connection timeout em aproximadamente 15,7 s. Resultado inconclusivo; não permite atribuir CPU a worker nem excluir bloqueios.
- Logs da tentativa anterior: janela 23:58Z–00:04Z (parcial quando extraída), cinco cancelamentos por statement timeout em postgres_logs, três mensagens 57014 PostgREST, startup timeout cron job 2 três vezes e jobs 4/15 uma vez cada; um checkpoint starting time e uma conexão local pgBouncer encerrada por connect timeout de 15 s. Contagens de mensagens, não de operações independentes.
- Status público consultado em https://status.supabase.com/: Database, Auth, pooler e região sa-east-1 Operational. API Gateway degraded por incidente aberto de rejeição JWT/401, atualização de 25/09. Não há evidência de que esse incidente explique o CONNECT_TIMEOUT deste projeto. Status global não exclui problema isolado de infraestrutura.
- Painel existente Observability/Database: janela fixa 17h52–20h52; última amostra dos gráficos aproximadamente 20h22–20h24. Mostra CPU 96,96%, throughput 523 KB/s, 15 conexões e memória used 411,33 MB. Estes valores NÃO são amostras de 21h04. Refresh report acionado uma vez, sem deslocar a janela fixa; não apresentar como melhora pós-deploy.
- Objetos exibidos antes do refresh: net._http_response 118,87 MB/52,18%; cron.job_run_details 62,93 MB/27,63%; índice de run_details 8,43 MB. Tamanhos não provam que as tabelas estão causando CPU nem autorizam limpeza.
- Novo SQL mínimo agrupando apenas backend/state/wait em pg_stat_activity também falhou por connection timeout (~15,5 s). A via de investigação SQL está indisponível neste momento. Não insistir em retries ou executar DDL/limpeza sem diagnóstico.
- Próximo passo operacional: avaliar reinício controlado do projeto para recuperar acesso, com autorização específica por interromper conexões/requisições em andamento; depois medir processos e validar acesso. Alternativa: suporte Supabase com o relatório, sem enviar dados pessoais ou credenciais. Não trocar plano, apagar dados ou desligar notificações.

Há saturação de recursos e falhas generalizadas de acesso ao PostgreSQL. Há também um ciclo de consultas de disponibilidade confirmado no JavaScript publicado. Esse ciclo cria trabalho desnecessário no banco e gera tráfego e logs. Contudo, a contribuição exata desse ciclo para CPU e Disk I/O ainda não foi medida por intervalo, e ele não deve ser declarado a única causa do incidente.

O diagnóstico anterior que apontou diretamente para infraestrutura do provedor foi prematuro. Uma carga desnecessária produzida pelo aplicativo foi identificada. A duração total dos checkpoints também foi interpretada de forma excessiva: PostgreSQL distribui as escritas ao longo do tempo, então um checkpoint de 60 segundos não equivale automaticamente a 60 segundos de disco travado.

Também existem falhas no envio de WhatsApp, divergência entre a produção e a cópia local, e problemas de tratamento de erros e carregamento no login. Esses achados precisam de correções separadas e verificações próprias.

## Período e limites da medição

- Consultas de logs: 26/09/2026, de `00:00:00Z` a `23:59:59Z`.
- Horário local: UTC−3; a janela começa às 21h de 25/09 e termina às 20h59 de 26/09.
- A coleta aconteceu antes do encerramento dessa janela. O último horário contém apenas os registros já disponíveis; não é um dia completo consolidado.
- Contagens são dos eventos presentes no serviço de logs consultado. Não equivalem a pessoas, agendamentos ou mensagens entregues.
- Estatísticas SQL anteriores são acumuladas. `pg_stat_database.stats_reset` retornou 08/12/2025; a data de reset de `pg_stat_statements` não foi obtida. Não atribuir seu tempo acumulado ao dia do incidente.
- Tempo total de uma chamada MCP inclui rede, autenticação e execução. Não é uma medição isolada do tempo de execução SQL.
- Leituras SQL e advisories falharam intermitentemente por timeout. Isso limitou a validação de índices, políticas RLS, bloat real e migrações efetivamente aplicadas. Não foram realizados testes de carga ou EXPLAIN ANALYZE sobre o banco saturado.

## 1. Saturação e efeito operacional

O painel fornecido pelo usuário mostra Compute 100%, CPU 99%, memória 78% e Disk I/O 100% no final do gráfico. Isso confirma pressão de recursos na métrica exibida, mas a unidade, agregação temporal e composição exata do indicador Disk I/O não foram recuperadas. Não significa disco 100% cheio.

Logs do PostgreSQL registram timeouts em leituras simples de `site_config`, `services` e `barbers`, em comandos de preparação de sessão e nas consultas internas de `postgres_exporter`. Os erros não estão restritos a uma única RPC.

| Hora local de 26/09 | Requisições Gateway | Respostas 5xx | Média de `response.origin_time` |
| --- | ---: | ---: | ---: |
| 07h–08h | 2.393 | 0 | 105 ms |
| 08h–09h | 4.675 | 0 | 141 ms |
| 13h–14h | 4.725 | 0 | 122 ms |
| 17h–18h | 523 | 0 | 361 ms |
| 18h–19h | 274 | 90 | 65.091 ms |
| 19h–20h | 379 | 101 | 50.997 ms |
| 20h em diante, parcial | 100 | 54 | 70.344 ms |

O período com mais requisições não coincide com o período de maior latência. Portanto, quantidade de requisições por si só não explica toda a saturação. São necessárias medidas por intervalo da carga interna e de recursos. Uma resposta HTTP 200 também pode demorar muito: foi observada uma leitura de `auth_logo` com `response.origin_time` de 86.399 ms.

Na janela noturna inicial ocorreram milhares de 503; entre 07h e aproximadamente 17h houve recuperação visível; a degradação voltou por volta de 18h. Não se trata de uma indisponibilidade contínua e uniforme durante todo o dia.

## 2. Ciclo de consultas de agendamento confirmado em produção

O domínio acessível retornou o arquivo `/assets/index-DkCzq3Ga.js`:

`https://barbeariaraimundoss.vercel.app/`

O JavaScript publicado contém a mesma relação de dependências da versão HEAD de `src/components/Booking.tsx`:

1. `loadAvailableSlots` depende de `loadingSlots`.
2. Um efeito depende de `loadAvailableSlots` e o executa quando há data, serviço e barbeiro.
3. A função muda `loadingSlots` para verdadeiro ao começar e para falso ao finalizar.
4. Cada mudança altera a identidade do callback, que volta a disparar o efeito.
5. Ao terminar uma leitura, outra pode começar sem qualquer ação do usuário.

Esse mecanismo é um defeito concreto de dependências React. Não depende de uma mensagem Realtime para se repetir. O efeito publicado também aceita etapas anteriores a `success`, incluindo o formulário.

A cópia local contém uma mitigação que usa refs para controlar leituras em andamento, remove `loadingSlots` das dependências e restringe o efeito à etapa de escolha de horário. O arquivo servido em produção ainda contém o padrão antigo. Isso prova que essa mitigação não está no bundle observado, independentemente do estado do Git local.

### Volume registrado do navegador `supabase-js-web/2.95.3`

| Caminho | Chamadas | Respostas 5xx |
| --- | ---: | ---: |
| `/rest/v1/barber_breaks` | 16.856 | 8.479 |
| `/rest/v1/barber_schedules` | 5.471 | 1 |
| `/rest/v1/rpc/get_barber_busy_slots` | 5.089 | 0 |
| `/rest/v1/site_config` | 1.019 | 162 |
| `/rest/v1/services` | 434 | 40 |
| `/rest/v1/barbers` | 432 | 43 |
| `/rest/v1/user_roles` | 385 | 69 |
| `/auth/v1/token` | 155 | 81 |

Os três caminhos de disponibilidade somam 27.416 requisições, aproximadamente 69,4% dos 39.513 eventos Gateway disponíveis nessa janela. O referrer registrado para esses grupos é o domínio de produção. Referrer não prova a identidade ou legitimidade de cada cliente.

Não atribuir todas essas requisições ao ciclo de Booking: há consultas de pausas com formato diferente, originadas do fluxo de fila.

## 3. Fila: outro ciclo na cópia local e clientes com datas antigas

Na cópia local de `src/pages/FilaDaBarbearia.tsx`, o efeito que calcula horários disponíveis chama `loadBreaksForToday()` e depende de `barberBreaksByBarber`. A leitura atualiza esse mesmo estado com um objeto novo, inclusive `{}` em caso de erro. Isso pode disparar novamente o efeito, repetir a leitura e continuar mesmo quando o servidor falha.

O JavaScript atualmente publicado já separa a busca de pausas do cálculo visual e usa um callback estável para a leitura. Portanto:

- O defeito está confirmado na cópia local.
- O defeito não deve ser atribuído à fila do bundle atualmente servido.
- Publicar a cópia local indiscriminadamente pode reintroduzi-lo.

Os logs revelaram 8.467 respostas 503 para a mesma consulta de pausas da equipe com `date=eq.2026-09-24` durante a janela analisada de 26/09. Houve também 54 respostas 200 para esse formato e data. As leituras de pausas da equipe com data 26/09 receberam 3.101 respostas 200.

Isso confirma tráfego repetido com data antiga. A origem exata não foi atribuída a uma versão de navegador: pode envolver cliente com relógio incorreto, aplicação antiga, parâmetros persistidos ou outra fonte. A consulta de produção calcula a data a partir do relógio do cliente. Não há evidência suficiente para concluir ataque, bot ou usuário específico.

## 4. Login: falha de banco comprovada e fragilidades do frontend

Os logs Auth incluem:

- `context deadline exceeded` nos grants `password` e `refresh_token`.
- Falha ao localizar refresh token por não conseguir conectar ao PostgreSQL local.
- `error finding user: context canceled`.

O login chega ao serviço Auth e falha ao acessar o banco. Isso não é evidência de senha incorreta, chave inválida ou CPF inexistente.

PostgREST registrou, na janela de 18h em diante:

- 172 eventos com `Thread killed by timeout manager` agrupados com essa mensagem exata.
- 95 eventos com a mensagem exata de timeout SQL `57014`, além de eventos concatenados.
- 9 eventos `PGRST003`: timeout ao adquirir conexão do pool.

Poucas conexões globais não descartam espera no pool do PostgREST. A análise anterior que descartava qualquer problema de pool com base apenas em 16/60 conexões estava incompleta. O pool pode falhar por lentidão nas conexões disponíveis, independentemente do limite global.

Na leitura estática de `src/contexts/AuthContext.tsx`:

1. `onAuthStateChange` e `getSession` podem duplicar leituras de role e perfil na inicialização.
2. O estado `loading` pode ser liberado antes da leitura assíncrona da role. O redirecionamento depende de `user` e `role`, então o usuário pode ficar aguardando mesmo com sessão recebida.
3. `signInWithCPF` converte qualquer erro de login, incluindo indisponibilidade, em mensagem de CPF não cadastrado/acesso inválido.
4. Depois de autenticar por CPF, o fluxo faz `getUser`, sincronização de telefone por upsert e nova leitura de `blocked`, aumentando a dependência do banco no caminho de entrada.
5. Falhas na leitura de bloqueio podem virar `blocked=false`. A aplicação deve tratar falha de leitura como falha de verificação; nenhuma autorização deve ser obtida por fallback.

Esses pontos agravam a experiência e o volume de consultas. Não explicam, isoladamente, a incapacidade do próprio servidor Auth de conectar ao PostgreSQL.

## 5. WhatsApp e tarefas automáticas

O inventário remoto retornou dez jobs ativos, sem duplicidade de nomes nesse snapshot. Os jobs frequentes são:

- Lembrete: a cada minuto.
- Relatório diário: verificação a cada dez minutos.
- Atendimento vencido: verificação a cada dez minutos.

Os demais rodam diariamente. Frequência de verificação não equivale a frequência de envio.

Na janela analisada foram encontrados:

| Evidência | Quantidade observada |
| --- | ---: |
| `cron job 2 job startup timeout` — lembrete | 343 |
| `cron job 4 job startup timeout` — relatório | 53 |
| `cron job 15 job startup timeout` — atendimento vencido | 51 |
| `whatsapp-reminder` HTTP 200 | 963 |
| `whatsapp-reminder` HTTP 504 | 13 |
| `whatsapp-reminder` HTTP 546 | 12 |
| `whatsapp-reminder` HTTP 503 | 2 |
| `whatsapp-overdue-barber` HTTP 500 | 66 |

Execuções de lembrete HTTP 200 tiveram média de 22.359 ms e máximo de 148.513 ms. Status HTTP 200 não comprova que um lembrete foi enviado: o código pode retornar um resultado com erro de consulta, e também retorna 200 quando não há mensagens elegíveis.

Logs de função registraram 213 erros `PGRST002` na leitura de appointments (cache de esquema do banco), 56 `upstream request timeout`, 13 `57014` e 8 `Gateway Timeout` nesse fluxo. Esses grupos não devem ser somados aos eventos Gateway como se fossem novas requisições: são registros em camadas diferentes do mesmo processo.

Também foram encontrados:

- 36 resultados de envio informando `WhatsApp não está conectado`.
- 5 resultados de envio informando `HTTP 502: Bad Gateway`, acompanhados de logs das tentativas 1, 2 e 3.

Há falhas de conexão/envio no provedor Baileys além dos erros de banco. O código mantém nomes legados como `EVOLUTION_API_URL` e mensagens `Evolution API error`, mas isso não prova uso de Evolution API: o envio usa o servidor compatível e valida confirmação Baileys em outros fluxos. Não mudar o provedor com base nos nomes.

O efeito sobre entrega individual não foi auditado: requer cruzar ID de notificação, tentativa e confirmação do Baileys. Não concluir que todas as mensagens falharam, nem que o sistema de notificações está íntegro, apenas pelo status HTTP.

## 6. pg_net, manutenção e disco

Uma leitura remota anterior desta análise encontrou `net._http_response` com tamanho total de 119 MB, estimativa de 432 tuplas vivas, zero tuplas mortas na estatística e último autovacuum em 05/08/2026. O tamanho total inclui heap, índices e armazenamento auxiliar; a combinação é um sinal para investigação, não prova de bloat.

Estatísticas acumuladas previamente consultadas mostraram a rotina interna `DELETE FROM net._http_response ...` com 190.648 chamadas, aproximadamente 198.395.394 ms de tempo total e média de 1.040,6 ms. O tempo máximo também foi muito alto. Não foi obtido um delta atual para saber quanto dessa carga ocorreu durante a saturação.

O worker `pg_net 0.19.5` apareceu nos processos internos, sem evento de espera no snapshot. Processos internos com `state=null` eram omitidos pelo filtro anterior `state <> 'idle'`; o filtro foi corrigido nesta análise. Esse detalhe impede concluir que não havia atividade interna só porque apareciam poucas queries de clientes.

Não foram confirmados:

- Tamanho real do heap versus índices da tabela de respostas.
- Quantidade exata de respostas antigas e de requisições pendentes.
- Saturação/consumo de I/O por processo ou esgotamento de créditos de disco.
- Bloat ou necessidade de reconstrução de tabela.

As tentativas dessas leituras expiraram; uma leitura de estatísticas chegou a HTTP 524 no transporte MCP. Não foi feita limpeza, TRUNCATE, VACUUM FULL, alteração de TTL ou reinício do worker. Respostas armazenadas e requisições pendentes têm funções diferentes; uma limpeza indiscriminada pode eliminar informações de diagnóstico ou solicitações ainda não enviadas.

Referências: [pg_net no Supabase](https://supabase.com/docs/guides/database/extensions/pg_net), [checkpoints no PostgreSQL](https://www.postgresql.org/docs/current/runtime-config-wal.html#RUNTIME-CONFIG-WAL-CHECKPOINTS).

## 7. Relatórios, migrações, imagens e Realtime

### Relatórios

A RPC mensal local chama a prévia de fechamento financeiro uma vez por mês elegível, chegando a doze chamadas por consulta anual. A prévia calcula mais componentes do que os necessários ao gráfico. É um ponto real de custo a medir antes de publicar.

`BarberRevenueAnalytics.tsx` dispara nova leitura agregada para cada evento em quatro tabelas, sem agrupamento de eventos nem controle explícito de leitura em andamento. Pode gerar consultas concorrentes em mudanças em lote. Esse componente está não rastreado no Git local; não foi confirmado no bundle publicado como fonte de carga atual.

O cálculo local de minutos ocupados soma a duração dos serviços. Encaixes sobrepostos podem contar o mesmo intervalo mais de uma vez e subestimar a ociosidade. Isso é um risco de correção analítica, distinto da saturação, e deve ser resolvido por união/clipping dos intervalos quando a finalidade é medir ocupação física da cadeira.

A migração de comissão de 21/09 captura o percentual em um trigger de escrita de appointment; não executa recálculo financeiro em toda leitura de `services` ou `site_config`. Não há evidência que a identifique como causadora dos timeouts gerais. O custo de planos, índices e políticas em produção permaneceu parcialmente não verificável.

### Imagens

Downloads do Storage podem consumir egress/cached egress, mas isso não atribui o CPU e Disk I/O do PostgreSQL às fotos. A análise do incidente não encontrou evidência de que as imagens sejam o gatilho da saturação do banco.

### Realtime

Estatísticas históricas mostram leitura de WAL frequente, mas não foi obtido delta que responsabilize Realtime pelo pico. Quantidade de mensagens de negócio não equivale à quantidade de consultas internas do serviço. Canais necessários não devem ser desativados com base apenas em chamadas acumuladas.

### Logs

Os eventos disponíveis somaram 123.128 `postgrest_logs`, 39.513 `edge_logs`, 5.649 `postgres_logs` e 5.338 `function_logs` na janela. São contagens, não bytes. Elas reforçam a importância das consultas repetidas e do registro de falhas, mas não permitem atribuir os 7 GB históricos de ingestão com precisão.

Ingestão de logs, egress, cached egress, armazenamento e compute são métricas diferentes. Diminuir logs de console ajuda apenas uma parte da ingestão; não elimina o custo de consultas repetidas nem recupera compute por si só.

## 8. Divergência de versões e verificações

- Produção observada: `/assets/index-DkCzq3Ga.js` em `barbeariaraimundoss.vercel.app`.
- `barbeariaraimundos.vercel.app` retornou HTTP 404 no teste da raiz; esse domínio sem o segundo `s` aparece em alguns logs Auth. Pode haver abas antigas ou configuração de URL a revisar. Isso é separado dos timeouts SQL.
- HEAD local: `6d7841d`, 21/09/2026, preservação de taxas históricas de comissão.
- Há alterações locais pendentes no agendamento, dashboard, disponibilidade e funções, mais duas migrações e arquivos novos.
- Produção contém um ajuste de fila que não aparece no arquivo local. A publicação não pode ser presumida idêntica ao HEAD ou ao working tree.
- O build local já havia concluído nesta sessão; isso comprova empacotamento, não recuperação operacional do banco.
- Testes sem DOM foram executados com `npx vitest run --environment node`: 41 testes passaram em quatro arquivos (cache de disponibilidade, conflitos/pausas, comissão e composição analítica).
- A ausência de `jsdom` impediu a execução anterior na configuração padrão. O override de ambiente Node permitiu executar estes testes existentes sem instalar pacotes. Isso não substitui teste de renderização nem verificação ponta a ponta.

## Ordem concreta de correção e validação

1. Reconciliar a versão publicada e local da fila; eliminar os ciclos de consultas de Booking e impedir regressão da fila. Validar com navegador parado na tela, navegando e recebendo atualização Realtime, medindo requisições por caminho.
2. Publicar apenas o conjunto reconciliado e validado de correções operacionais; uma publicação genérica de todas as pendências inclui funcionalidades e riscos além do incidente.
3. Recuperar e medir o banco: nova medição curta de CPU/I/O, espera por pool, latência e erros após eliminar consultas desnecessárias. Medir deltas de `pg_stat_statements`, especialmente a manutenção de `pg_net`, sem apagar o histórico.
4. Se o banco permanecer saturado com o frontend estabilizado, usar a evidência para verificar worker interno, manutenção, créditos/limites de compute e disco, com suporte do Supabase quando necessário. Um reinício exige considerar indisponibilidade e fila HTTP pendente; não é diagnóstico nem solução definitiva por si só.
5. Corrigir estados e mensagens do login e reduzir leituras duplicadas, mantendo validação de role e bloqueio. Validar acesso de cliente, barbeiro e gestão com erro de rede e recuperação.
6. Verificar conexão do Baileys e confirmação das mensagens; corrigir retorno/observabilidade das funções que escondem erro em HTTP 200 e investigar os 500 recorrentes do atendimento vencido.
7. Medir custo dos novos relatórios antes de publicá-los, agrupar recargas Realtime e validar ocupação com encaixes sobrepostos.
8. Comparar tráfego e bytes de logs no ciclo seguinte. A meta de 700 MB/mês não pode ser garantida por este diagnóstico nem pelos totais históricos acumulados.

## Estado ao finalizar esta análise

O diagnóstico identifica defeitos concretos e falhas reais, mas não declara recuperação do sistema nem atribui 100% da carga a um único processo. O pico exato de CPU e disco por processo ainda não foi medido. Nesta etapa de análise foram feitas consultas de leitura, inspeção de código/bundle e testes locais. Não foram alterados banco, jobs, agendamentos, comissões, notificações, deploy ou histórico Git. Foi criado apenas este relatório local.

## Registro incremental de consultas e evidências

### Pós-publicação — recuperação parcial e novo CONNECT_TIMEOUT

- Probe mínimo SQL respondeu connection_ok=1 em 27/09 00:00:21 UTC (26/09 21:00:21 BRT), aproximadamente 15,9 s no transporte MCP. Comprova acesso naquele instante, não latência SQL isolada nem estabilidade.
- Logs consultados uma vez na janela 26/09 23:45:00–23:59:50 UTC: token teve 2/2 falhas 5xx às 23:45 e 4/4 às 23:55; user_roles 2/2 e 3/3 falhas nas primeiras janelas, depois 0/2 falhas; profiles 0/2 na última. Última janela parcial e ingestão pode atrasar. Comparação não permite concluir recuperação total ou atribuir causalidade ao deploy.
- Novo alerta informado pelo usuário: Database not usable, CONNECT_TIMEOUT em 5.007 ms. Falha do probe na etapa de conexão TCP; coexistência com probe SQL bem-sucedido indica acesso intermitente ou diferenças de instante/caminho, não contradição.
- Próximas ações sugeridas: verificar CPU e saldo/throughput Disk I/O, identificar processos/consultas e pressão de pool quando acessível; preservar segurança e dados. Correção frontend já publicada, mas conexão indisponível ainda exige investigação interna. Reinício apenas como recuperação controlada, com avaliação de interrupção e requisições pendentes, não como correção de causa raiz.

### Confirmação de implantação do hotfix

- Vercel Deployment Details: qWvTZf7jC2KUtkYHh91ogNpRR95u, Ready / Latest, Production / Current, commit 2d3e55f, domínio barbeariaraimundoss.vercel.app.
- Build remoto duração 29 s; página exibe referência 26/09/2026 20:58:07 BRT. Implantação verificada no navegador da conta correta, não pelo plugin de outra conta.
- URL de evidência: https://vercel.com/barbearia-raimundos-projects/barbearia/qWvTZf7jC2KUtkYHh91ogNpRR95u . Screenshot do painel capturado na sessão.
- Status atualizado: hotfix de frontend publicado. Não há nesta confirmação teste de login real, prova de normalização de CPU/I/O ou recuperação PostgreSQL. Nenhuma migração ou escrita em banco foi executada.
- Próxima avaliação deve comparar estado de saúde e erros em janela posterior à implantação, considerando abas antigas e cache/PWA; não atribuir todo resultado imediatamente ao hotfix.

### Continuidade — hotfix isolado enviado para produção

- Conta correta confirmada no navegador: Barbearia Raimundos' projects, projeto barbearia, domínio barbeariaraimundoss.vercel.app. Produção anterior Ready em 3d8fa97; acesso do navegador difere da conta conectada ao plugin Vercel.
- Reutilizado checkout gerenciado já existente hotfix-booking-count-timeout, inicialmente limpo e em 3d8fa97. Trabalho pendente do checkout principal preservado.
- Patch isolado: Booking usa ref para trava de leitura, retira loading/time das dependências do efeito, mantém hora selecionada via atualização funcional e consulta inicialmente apenas na etapa time; funções do hook operatingHours estabilizadas; cache de configurações deduplica concorrência e Booking compartilha footer_info. Realtime existente permanece. Não foram incluídos caches novos de disponibilidade, migrações, relatórios ou alterações de Edge Functions.
- Testes: inicialmente 38/40 passaram na base remota. Duas expectativas antigas contrariavam fronteiras de intervalo (fim exato de almoço/atendimento); ajustados somente testes conforme a validação anterior, sem alterar regra. Depois 40/40 passaram. Build Vite/PWA concluído.
- Commit 2d3e55f, cinco arquivos, push fast-forward 3d8fa97..2d3e55f para origin/main realizado. O comando Git também relatou packed-refs.lock existente; commit e push concluíram, lock não foi removido indiscriminadamente.
- Vercel observada Building na implantação qWvTZf7jC2KUtkYHh91ogNpRR95u. Conclusão Ready e recuperação do banco ainda não confirmadas neste registro.

### Continuidade — revisão da origem Git e destino de publicação

- Fonte: git fetch origin e ls-remote, ferramentas Vercel list_teams/list_projects autenticadas. Nenhuma publicação ou mudança de banco executada.
- GitHub origin/main está em 3d8fa97, adiante do HEAD local 6d7841d. Commits adicionais: bc3c550 remove agregado lento, 25e98af separa leitura de pausas da fila, 3d8fa97 evita lock no callback Auth. Isso explica parte da divergência de bundle; não provar deploy atual somente pela existência de commit remoto.
- Reconciliado AuthContext local com a correção remota: callback deixa de aguardar signOut dentro do lock Auth e a inicialização duplicada por getSession é removida. git diff origin/main desse arquivo ficou vazio. Nenhum dado financeiro, permissões ou CPF alterados.
- Ferramenta Vercel conectada retorna apenas equipe dewsk e projeto zelaruni. Não é o projeto da Barbearia. Não há .vercel/project.json local e Vercel CLI não foi localizado. Não usar deploy_to_vercel para criar/alterar projeto errado.
- Bloqueio de publicação: requer acesso autenticado à conta Vercel que contém barbeariaraimundoss ou outro mecanismo confirmado de publicação desse projeto. Não basta login no Supabase para publicar frontend Vercel.
- Mantidas todas as alterações locais. Não foi feito commit, push, reset, checkout destrutivo ou publicação de funcionalidades pendentes. Próxima etapa deve usar origin/main como base e somente o patch operacional adicional, preservando as correções remotas.

### Continuidade — evidência visual do orçamento de Disk I/O

- Fonte: screenshot do painel enviado pelo usuário, eixo aproximadamente 19:51–20:50 de 26/09; instante exato da captura não informado.
- Novo banner explícito: projeto próximo de esgotar Disk IO Budget. O texto informa throughput baseline de 5 MB/s quando esgotado, com reposição quando demanda fica em ou abaixo do baseline. Antes, esgotamento de créditos era uma hipótese não confirmada; agora há alerta de proximidade, não prova de saldo zero.
- Estado mostrado: CPU 98%, disco 8% (ocupação, não throughput), RAM 64%, conexões indisponíveis. Database/Auth/Realtime Unhealthy; PostgREST/Storage/Edge Functions Healthy nos indicadores de serviço.
- Advisor agora mostra um item, Database not usable, CONNECT_TIMEOUT após 5.002 ms. O aviso anterior de taxa elevada não aparece, mas API Gateway mostra 131 erros em 279 eventos na janela de 60 minutos exibida. Não confundir esta janela com as duas janelas de cinco minutos do detector.
- Conclusão: desaparecimento de um advisor não comprova recuperação operacional. PostgREST saudável como serviço não garante acesso ao banco nem login. Não atribuir melhoria às correções locais, que ainda não foram publicadas.
- Próximo passo: reduzir carga desnecessária via publicação isolada e medir CPU/throughput/saldo I/O quando acessíveis. Mantendo Free, a prioridade é reduzir demanda; não executar upgrade, limpeza destrutiva ou reinício sem avaliar impacto. Persistência de indisponibilidade exige investigação dos processos internos e/ou suporte da plataforma.

### Continuidade — teste de navegação com dados controlados

- Ambiente: build local em Vite preview; sessão isolada agent-browser. Interceptação REST e bloqueio Auth configurados antes da navegação; mock de fetch instalado na sessão para fornecer serviço/barbeiro fictícios. Nenhum registro de produção consultado ou escrito pelo fluxo simulado.
- Limitação inicial: mock por network route retornou Failed to fetch no navegador; não usar essa falha como evidência do banco. O transporte simulado por fetch permitiu o teste. Link de início recarrega o documento e perde mock; a navegação de teste usou History API/popstate, mantendo a simulação isolada.
- Fluxo executado: serviço Corte Teste → Barbeiro Teste → indisponibilidade hoje após fechamento → Agendar Futuro → 28/09/2026 → horários 09:00 a 19:30 → seleção 09:00 → formulário Confirmar Agendamento.
- Estabilidade: durante dez segundos parado na seleção de horários, a contagem permaneceu exatamente igual: site_config 7, public_daily_queue 2, barbers 5, barber_schedules 4, barber_breaks 3, services 3, busy_slots 3. São totais cumulativos do trajeto simulado, não contagem por abertura nem tráfego de produção. Não ocorreu recarga contínua nesse cenário.
- Segurança: Confirmar não foi acionado; não foram testados cadastro, escrita, concorrência real ou envio de WhatsApp. Cenário sem pausas/agendamentos simulados, usando horários padrão, não comprova regras reais de produção; testes unitários anteriores cobrem conflitos/pausas.
- Resultado: transição até formulário e ausência de ciclo em repouso verificadas localmente. Banco real/login permanecem não recuperados neste registro. Browser e preview encerrados após captura.
- Próximo passo: preparar conjunto isolado de publicação das correções operacionais, sem misturar dashboards/migrações financeiras e mudanças de funções. Validar novamente Data API/Auth após publicação; o teste simulado não substitui essa validação.

### Continuidade — leitor direto de endereço no agendamento

- Objetivo: eliminar a segunda leitura footer_info observada no navegador local.
- Evidência: Booking.loadBarbershopAddress fazia consulta direta enquanto Footer utilizava getSiteConfig. Leitura do código identificou a origem, sem repetir consulta remota.
- Correção local: Booking usa o mesmo cache footer_info. Endereço e maps_link continuam extraídos pelo mesmo parser; nenhuma configuração gravada. Leituras de operating_hours na confirmação permanecem diretas para não enfraquecer a verificação final.
- Verificação: 45 testes em cinco arquivos passaram; novo teste cobre liberação da requisição pendente após exceção de rede. Build Vite/PWA concluído. A contagem final em navegador e o fluxo com dados controlados ainda precisam ser executados; não foram apresentados como concluídos.
- Publicação: não realizada. O working tree contém dashboard/migrações/WhatsApp misturados com correções de carga; precisa de conjunto isolado para publicação. Falha real de conexão SQL registrada anteriormente permanece o bloqueio para validar login real.

### Continuidade — navegador local e deduplicação de configurações

- Fonte: build servido por Vite preview em 127.0.0.1:4173, sessão isolada agent-browser; nenhum login ou agendamento enviado.
- Antes: HTML/JS/imagem local HTTP 200, página não vazia, consultas remotas de serviços/barbeiros/configurações pendentes. Duas chamadas operating_hours e três footer_info na captura inicial.
- Correção: siteConfigCache compartilha promessa pendente por chave, não armazena erros, usa TTL a partir da conclusão e impede que resposta antiga restaure cache invalidado. Nenhum valor de configuração modificado.
- Depois: uma chamada operating_hours e duas footer_info na captura inicial. Permanecem leitores diretos a investigar; não declarar eliminação de todas as duplicações. Chamadas pendentes não permitem validar dados reais de disponibilidade/login.
- Testes: 44 testes em cinco arquivos passaram, incluindo concorrência, erro e invalidação durante consulta; build e geração PWA concluídos. Alertas de bundle grande/Browserslist não são evidência de causa do timeout SQL.
- Limite: navegação completa do agendamento bloqueada pela falta de dados remotos. Browser fechado após captura para evitar tráfego adicional; nenhum deploy, commit, push ou alteração de produção.
- Próximo passo: revisar leitores restantes, validar fluxo com dados controlados e preparar publicação isolada. Recuperação do banco e acessos reais continuam não confirmados.

### Continuidade — probe mínimo de conexão

- Objetivo: verificar mudança de estado sem repetir estatísticas históricas.
- Consulta MCP: `select clock_timestamp() as observed_at, 1 as connection_ok`.
- Resultado: `Connection terminated due to connection timeout`, aproximadamente 15,5 segundos no transporte. Não houve leitura de tabelas ou alteração de dados.
- Conclusão: não há evidência de recuperação do acesso SQL neste probe; o tempo inclui transporte e não equivale ao tempo de execução da query.
- Limite: falha MCP não mede isoladamente o acesso de um cliente Auth/Data API. Evitar retry contínuo; validar frontend de forma isolada e realizar próxima medição apenas para verificar mudança de estado.

### Continuidade — correção local do ciclo da fila

- Objetivo: reconciliar a fila local com a separação de efeitos encontrada no bundle publicado, impedindo regressão ao publicar.
- Fonte: diff de Booking e leitura de FilaDaBarbearia; nenhuma nova extração histórica do Supabase.
- Alteração: loadBreaksForToday estabilizado por useCallback; leitura de pausas separada do efeito que calcula os horários disponíveis. Alterar barberBreaksByBarber não dispara outra consulta. Chamadas explícitas após operações continuam existentes.
- Verificação: 41 testes passaram em quatro arquivos, com ambiente Node. Build Vite concluído; teste de navegador/contagem de chamadas e recuperação operacional ainda pendentes.
- Limites: Booking já contém correções locais anteriores e outras alterações funcionais; o diff não deve ser publicado indiscriminadamente. Nenhuma regra de agendamento, registro financeiro ou banco foi alterado nesta continuidade.
- Próximo passo: teste de renderização/requisições, revisão do conjunto de publicação e medição curta do estado do banco. Não declarar incidente resolvido apenas por testes locais.

Regra de continuidade: ler este documento antes de consultar novamente. Para cada nova consulta, registrar objetivo, fonte/janela, resultado, limitação e próximo passo. Não repetir consultas já respondidas; repetir apenas para medir mudança de estado ou preencher lacuna explícita. Falha de consulta deve ser registrada como inconclusiva, nunca como ausência de problema. Não incluir credenciais ou dados pessoais.

### 30/09/2026 — Dashboard financeiro publicado e verificação pós-publicação

- Objetivo: concluir as funções analíticas somente de leitura, validar equivalência financeira, publicar o Dashboard Gerencial e medir o estado imediatamente posterior sem alterar agendamentos, valores ou notificações.
- Migrações aplicadas no projeto `wabefmgfsatlusevxyfo`: evolução de receita/ociosidade por barbeiro, resumo financeiro mensal e correção da ocupação por união de intervalos. O resumo anual foi otimizado para agregar cada tabela uma vez; a versão anterior chamava a prévia completa de fechamento até doze vezes.
- Segurança verificada: `anon` não possui `EXECUTE` nas duas RPCs; `authenticated` possui. A evolução de receita usa `SECURITY INVOKER`. O resumo financeiro usa `SECURITY DEFINER`, revoga acesso público e valida `auth.uid()` com papel `admin` ou `gestor` antes de consultar dados.
- Correção financeira: agosto/2026 foi comparado com `preview_managerial_financial_closure`. Receita de serviços, receita de produtos, comissões de serviços e produtos, despesas, insumos, lucro líquido e quantidade de taxas históricas estimadas apresentaram igualdade em todos os campos.
- Desempenho medido com `EXPLAIN ANALYZE`: resumo anual retornou 12 linhas em 14,204 ms e 451 buffers compartilhados; evolução diária de agosto retornou 93 linhas em 38,173 ms e 1.455 buffers compartilhados. Em `pg_stat_statements`, 59 chamadas relacionadas registravam média de 15,3 ms e máximo de 220,7 ms no instante da consulta.
- Conexões no instante da leitura: 18 totais, 2 ativas e nenhuma `idle in transaction`. Esta é uma fotografia pontual, não garantia de comportamento futuro.
- Publicação: commit `62dbb26` enviado para `origin/main`; implantação Vercel correspondente ficou `Ready`. O domínio de produção respondeu HTTP 200 com o bundle `index-CFpVW7R9.js`, contendo as novas telas e RPCs.
- Painel Supabase após a publicação: projeto `Healthy`, CPU 5%, disco 5%, RAM 59% e 10/60 conexões. Últimos 60 minutos: 1.242 requisições, 98,3% de sucesso, API Gateway com zero erros, Edge Functions/Auth/Storage/Realtime com zero erros. Postgres exibiu três erros na janela agregada; a visão geral não identifica seus comandos. Advisor não encontrou problema ativo.
- Limites: a janela inclui tráfego anterior à publicação e as próprias consultas controladas de validação. O resultado não comprova a meta mensal de logs nem substitui acompanhamento diário. Próximo passo é observar consumo e erros sem reexecutar consultas pesadas, investigando apenas se os indicadores voltarem a subir.

### 26/09/2026 — Alertas de saúde informados pelo usuário

- Fonte: texto dos alertas do painel Supabase fornecido pelo usuário; instante exato e janela absoluta não informados. Não foi executada nova consulta ao banco para este registro.
- **Data API error rate is persistently high:** 100% das 47 requisições falharam na avaliação informada. O detector considera dois períodos consecutivos de cinco minutos e dispara com pelo menos 10% de respostas 5xx em ambos. Confirma indisponibilidade persistente da API na janela avaliada; não identifica sozinho endpoint, query, política ou processo causador.
- **Database not usable:** conexão TCP não produziu conexão utilizável em 5.009 ms (`CONNECT_TIMEOUT`). Confirma falha na etapa de conexão daquele probe, anterior à execução de uma query. Não é evidência de senha incorreta, erro de CPF, comissão, nem de tabela específica.
- Correlação: os alertas são compatíveis com os timeouts Auth/PostgREST/pool e pressão de CPU/I/O já documentados. A indisponibilidade do banco pode explicar falhas da Data API, mas a correlação não demonstra a causa raiz exclusiva nem prova falha da infraestrutura do fornecedor.
- Correções prioritárias sugeridas: estabilizar as consultas repetidas comprovadas no frontend, reconciliar versões antes de publicar, verificar conexões/esperas e workers com leituras leves quando o banco responder, e verificar saúde da plataforma/rede se a conexão continuar indisponível. Não aumentar timeouts globalmente, desativar RLS, apagar tabelas ou interromper notificações como solução genérica.
- Validação de recuperação: conexão utilizável, leitura pequena autenticada funcionando, login das três funções e queda de 5xx/latência em janelas consecutivas; indicador verde isolado não substitui teste operacional.
- Estado: diagnóstico atualizado; nenhuma correção de produção executada nesta consulta. Próxima medição deve ser de mudança de estado, sem repetir a extração histórica completa.
