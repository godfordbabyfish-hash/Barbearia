/**
 * Validação de CPF brasileiro
 * Implementa o algoritmo completo de validação de CPF
 */

/**
 * Remove formatação do CPF, deixando apenas números
 * @param cpf - CPF com ou sem formatação
 * @returns CPF apenas com números
 */
export const cleanCPF = (cpf: string): string => {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
};

/**
 * Formata CPF com máscara (000.000.000-00)
 * @param cpf - CPF com ou sem formatação
 * @returns CPF formatado
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return cpf; // Retorna original se não tiver 11 dígitos
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Valida CPF usando o algoritmo completo brasileiro
 * Verifica:
 * - Tamanho (11 dígitos)
 * - Dígitos verificadores
 * - CPFs inválidos conhecidos (111.111.111-11, etc.)
 * 
 * @param cpf - CPF a validar (pode ter formatação)
 * @returns Objeto com isValid (boolean) e errorMessage (string | null)
 */
export const validateCPF = (cpf: string): { isValid: boolean; errorMessage: string | null } => {
  if (!cpf || typeof cpf !== 'string') {
    return {
      isValid: false,
      errorMessage: 'CPF é obrigatório'
    };
  }

  // Remove formatação
  const cleaned = cleanCPF(cpf);

  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) {
    return {
      isValid: false,
      errorMessage: 'CPF deve ter 11 dígitos'
    };
  }

  // Verifica se todos os dígitos são iguais (CPFs inválidos conhecidos)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return {
      isValid: false,
      errorMessage: 'CPF inválido. Verifique os dígitos informados.'
    };
  }

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) {
    return {
      isValid: false,
      errorMessage: 'CPF inválido. Verifique os dígitos informados.'
    };
  }

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) {
    return {
      isValid: false,
      errorMessage: 'CPF inválido. Verifique os dígitos informados.'
    };
  }

  return {
    isValid: true,
    errorMessage: null
  };
};
