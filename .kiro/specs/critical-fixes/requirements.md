# Documento de Requisitos

## Introdução

Este documento especifica os requisitos para corrigir dois problemas críticos no sistema: a falha na remoção de vales por gestores/admins devido a restrições de RLS (Row Level Security) e o comportamento inadequado de auto-relogin contínuo do sistema WhatsApp que causa reconexões desnecessárias.

## Glossário

- **Sistema**: A aplicação web de gestão de barbearia
- **Gestor**: Usuário com permissões administrativas
- **Vale**: Adiantamento financeiro registrado no sistema para barbeiros
- **RLS**: Row Level Security do Supabase que controla acesso a dados
- **WhatsApp_Manager**: Componente responsável pela gestão da conexão WhatsApp
- **Evolution_API**: API externa usada para integração WhatsApp
- **Auto_Relogin**: Processo automático de reconexão do WhatsApp

## Requisitos

### Requisito 1: Remoção de Vales por Gestores

**User Story:** Como gestor/admin, eu quero remover vales do sistema, para que eu possa corrigir erros e manter os dados atualizados.

#### Critérios de Aceitação

1. QUANDO um gestor tenta remover um vale existente, O Sistema DEVE remover o vale da base de dados com sucesso
2. QUANDO a remoção é executada, O Sistema DEVE contornar as restrições de RLS através de uma função RPC autorizada
3. QUANDO um vale é removido, O Sistema DEVE atualizar a interface imediatamente para refletir a remoção
4. QUANDO a remoção falha, O Sistema DEVE exibir uma mensagem de erro clara e específica
5. QUANDO um gestor não tem permissões adequadas, O Sistema DEVE bloquear a operação e informar sobre a falta de autorização

### Requisito 2: Controle Manual de Conexão WhatsApp

**User Story:** Como gestor, eu quero controlar manualmente quando conectar e desconectar o WhatsApp, para que o sistema não fique fazendo reconexões automáticas desnecessárias.

#### Critérios de Aceitação

1. QUANDO o WhatsApp está desconectado, O WhatsApp_Manager DEVE permitir conexão manual através de botão específico
2. QUANDO o WhatsApp está conectado, O WhatsApp_Manager DEVE parar todo polling automático e reconexões
3. QUANDO o gestor clica em "remover/desconectar", O WhatsApp_Manager DEVE desconectar e parar todos os processos automáticos
4. QUANDO uma conexão é estabelecida, O Sistema DEVE manter o status sem tentar reconectar automaticamente
5. QUANDO há erro de conexão, O Sistema DEVE informar o erro mas NÃO DEVE tentar reconectar automaticamente

### Requisito 3: Gestão de Estado de Conexão WhatsApp

**User Story:** Como gestor, eu quero ver claramente o status da conexão WhatsApp, para que eu saiba quando o sistema está conectado ou desconectado.

#### Critérios de Aceitação

1. QUANDO o WhatsApp está conectado, O Sistema DEVE exibir status "Conectado" com indicador visual verde
2. QUANDO o WhatsApp está desconectado, O Sistema DEVE exibir status "Desconectado" com indicador visual vermelho
3. QUANDO há erro de conexão, O Sistema DEVE exibir status "Erro" com indicador visual amarelo e mensagem específica
4. QUANDO o status muda, O Sistema DEVE atualizar a interface imediatamente
5. QUANDO a página é recarregada, O Sistema DEVE verificar o status atual sem iniciar conexão automática

### Requisito 4: Função RPC para Remoção de Vales

**User Story:** Como desenvolvedor, eu quero uma função RPC segura para remoção de vales, para que gestores possam remover vales respeitando as políticas de segurança.

#### Critérios de Aceitação

1. QUANDO a função RPC é chamada com ID válido, O Sistema DEVE verificar se o usuário tem permissões de gestor
2. QUANDO as permissões são validadas, O Sistema DEVE remover o vale da tabela barber_advances
3. QUANDO o vale não existe, O Sistema DEVE retornar erro específico "Vale não encontrado"
4. QUANDO o usuário não tem permissões, O Sistema DEVE retornar erro "Acesso negado"
5. QUANDO a remoção é bem-sucedida, O Sistema DEVE retornar confirmação com ID do vale removido

### Requisito 5: Prevenção de Loops de Reconexão

**User Story:** Como gestor, eu quero que o sistema pare de fazer loops de reconexão, para que a interface seja estável e não consuma recursos desnecessariamente.

#### Critérios de Aceitação

1. QUANDO uma conexão WhatsApp é estabelecida, O Sistema DEVE parar todos os timers e polling automático
2. QUANDO há múltiplos useEffect ativos, O Sistema DEVE cancelar os anteriores antes de iniciar novos
3. QUANDO o componente é desmontado, O Sistema DEVE limpar todos os timers e listeners ativos
4. QUANDO há erro de conexão, O Sistema DEVE aguardar ação manual ao invés de tentar reconectar
5. QUANDO o gestor navega para outra página, O Sistema DEVE manter o status da conexão sem reiniciar processos