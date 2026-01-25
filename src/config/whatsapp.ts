/**
 * Configuração Centralizada do WhatsApp
 * 
 * Este arquivo centraliza todas as configurações relacionadas ao WhatsApp
 * para facilitar a troca de conta/número.
 * 
 * IMPORTANTE: Para trocar a conta WhatsApp que vai ler o QR code:
 * 1. Altere o valor de DEFAULT_INSTANCE_NAME abaixo
 * 2. Atualize a variável de ambiente EVOLUTION_INSTANCE_NAME no Supabase
 * 3. Se necessário, delete a instância antiga e crie uma nova
 */

/**
 * Nome padrão da instância WhatsApp
 * 
 * Este é o nome da instância que será usada para conectar ao WhatsApp.
 * Quando você trocar de número/conta, altere este valor.
 * 
 * Exemplos:
 * - 'default' (padrão do bot Railway)
 * - 'instance-1'
 * - 'barbearia-whatsapp'
 * - Qualquer nome único que você preferir
 */
export const DEFAULT_INSTANCE_NAME = 'default';

/**
 * Configurações adicionais do WhatsApp (opcional)
 */
export const WHATSAPP_CONFIG = {
  /**
   * Nome padrão da instância
   */
  defaultInstanceName: DEFAULT_INSTANCE_NAME,
  
  /**
   * Tempo de timeout para operações (em milissegundos)
   */
  timeout: 60000, // 60 segundos
  
  /**
   * Número de tentativas para envio de mensagens
   */
  retryAttempts: 3,
  
  /**
   * Delay entre tentativas (em milissegundos)
   */
  retryDelay: 2000, // 2 segundos
} as const;

/**
 * Helper para obter o nome da instância ativa
 * 
 * Esta função verifica primeiro no banco de dados (site_config),
 * depois na variável de ambiente, e por último usa o valor padrão.
 * 
 * @param activeInstanceFromDB - Nome da instância do banco de dados (opcional)
 * @param envInstanceName - Nome da instância da variável de ambiente (opcional)
 * @returns Nome da instância a ser usada
 */
export const getActiveInstanceName = (
  activeInstanceFromDB?: string | null,
  envInstanceName?: string | null
): string => {
  // Prioridade 1: Banco de dados (configuração salva no painel admin)
  if (activeInstanceFromDB) {
    return activeInstanceFromDB;
  }
  
  // Prioridade 2: Variável de ambiente
  if (envInstanceName) {
    return envInstanceName;
  }
  
  // Prioridade 3: Valor padrão do código
  return DEFAULT_INSTANCE_NAME;
};

/**
 * Validação do nome da instância
 * 
 * @param instanceName - Nome da instância a validar
 * @returns true se o nome é válido
 */
export const isValidInstanceName = (instanceName: string): boolean => {
  if (!instanceName || typeof instanceName !== 'string') {
    return false;
  }
  
  // Nome deve ter entre 1 e 50 caracteres
  if (instanceName.length < 1 || instanceName.length > 50) {
    return false;
  }
  
  // Nome deve conter apenas letras, números, hífens e underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(instanceName);
};
