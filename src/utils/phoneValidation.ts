/**
 * Valida formato de telefone brasileiro
 * Formato esperado: DDD (2 dígitos) + número (8 dígitos, sem o 9)
 * Total: 10 dígitos (DDD 2 + número 8)
 * 
 * @param phone - Número de telefone a validar (pode conter caracteres não numéricos)
 * @returns Objeto com isValid (boolean) e errorMessage (string | null)
 */
export const validateBrazilianPhone = (phone: string): { isValid: boolean; errorMessage: string | null } => {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Número de telefone é obrigatório'
    };
  }

  // Remove todos os caracteres não numéricos
  const digitsOnly = phone.replace(/\D/g, '');

  // Remove @s.whatsapp.net se estiver presente
  const cleaned = digitsOnly.replace(/@s\.whatsapp\.net/gi, '');

  // Verifica se está vazio após limpeza
  if (!cleaned || cleaned.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Número de telefone inválido. Digite apenas números.'
    };
  }

  // Verifica se começa com código do país (55) - não permitir no login
  if (cleaned.startsWith('55')) {
    return {
      isValid: false,
      errorMessage: 'Digite apenas o DDD + número (exemplo: 9691944679). Não inclua o código do país (55).'
    };
  }

// Verifica tamanho: deve ter exatamente 10 dígitos (DDD 2 + número 8)
  if (cleaned.length < 10) {
    return {
      isValid: false,
      errorMessage: `Formato incorreto. Use: DDD (2 dígitos) + número (8 dígitos). Exemplo: 8200000000`
    };
  }

  if (cleaned.length > 10) {
    return {
      isValid: false,
      errorMessage: `Formato incorreto. Use: DDD (2 dígitos) + número (8 dígitos). Exemplo: 8200000000`
    };
  }

  // Verifica se o DDD é válido (primeiros 2 dígitos devem ser entre 11 e 99)
  const ddd = cleaned.substring(0, 2);
  const dddNumber = parseInt(ddd, 10);
  
  if (isNaN(dddNumber) || dddNumber < 11 || dddNumber > 99) {
    return {
      isValid: false,
      errorMessage: 'DDD inválido. O DDD deve ter 2 dígitos entre 11 e 99.'
    };
  }

  // Verifica se o número (após DDD) tem exatamente 8 dígitos
  const numberPart = cleaned.substring(2);
  if (numberPart.length !== 8) {
    return {
      isValid: false,
      errorMessage: 'Formato incorreto. Use: DDD (2 dígitos) + número (8 dígitos). Exemplo: 8200000000'
    };
  }

  // Verifica se todos os dígitos são válidos (não são todos zeros)
  if (cleaned === '00000000000' || cleaned === '0000000000') {
    return {
      isValid: false,
      errorMessage: 'Número de telefone inválido.'
    };
  }

  return {
    isValid: true,
    errorMessage: null
  };
};

/**
 * Valida formato de telefone para WhatsApp (aceita com ou sem código do país)
 * Formato aceito: 55 (opcional) + DDD (2 dígitos) + número (8 ou 9 dígitos)
 * Total: 13 ou 14 dígitos (com código 55) ou 10-11 dígitos (sem código 55)
 * 
 * @param phone - Número de telefone a validar
 * @returns Objeto com isValid (boolean) e errorMessage (string | null)
 */
export const validateWhatsAppPhone = (phone: string): { isValid: boolean; errorMessage: string | null } => {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Número de WhatsApp é obrigatório'
    };
  }

  // Remove todos os caracteres não numéricos
  const digitsOnly = phone.replace(/\D/g, '');

  // Remove @s.whatsapp.net se estiver presente
  const cleaned = digitsOnly.replace(/@s\.whatsapp\.net/gi, '');

  // Verifica se está vazio após limpeza
  if (!cleaned || cleaned.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Número de WhatsApp inválido. Digite apenas números.'
    };
  }

  // Se começa com 55, deve ter 13 ou 14 dígitos (55 + DDD 2 + número 8 ou 9)
  if (cleaned.startsWith('55')) {
    if (cleaned.length < 13 || cleaned.length > 14) {
      return {
        isValid: false,
        errorMessage: 'Número com código do país (55) deve ter 13 ou 14 dígitos. Exemplo: 559691944679'
      };
    }
    
    // Verifica DDD (posições 2-3)
    const ddd = cleaned.substring(2, 4);
    const dddNumber = parseInt(ddd, 10);
    
    if (isNaN(dddNumber) || dddNumber < 11 || dddNumber > 99) {
      return {
        isValid: false,
        errorMessage: 'DDD inválido. O DDD deve ter 2 dígitos entre 11 e 99.'
      };
    }

    // Verifica número (após 55 + DDD)
    const numberPart = cleaned.substring(4);
    if (numberPart.length < 8 || numberPart.length > 9) {
      return {
        isValid: false,
        errorMessage: 'Número inválido. Após o código do país (55) e DDD, o número deve ter 8 ou 9 dígitos.'
      };
    }

    return {
      isValid: true,
      errorMessage: null
    };
  }

  // Se não começa com 55, deve ter 10 ou 11 dígitos (DDD 2 + número 8 ou 9)
  if (cleaned.length < 10 || cleaned.length > 11) {
    return {
      isValid: false,
      errorMessage: 'Número deve ter 10 ou 11 dígitos (DDD + número) ou 13-14 dígitos (55 + DDD + número). Exemplo: 9691944679 ou 559691944679'
    };
  }

  // Verifica DDD
  const ddd = cleaned.substring(0, 2);
  const dddNumber = parseInt(ddd, 10);
  
  if (isNaN(dddNumber) || dddNumber < 11 || dddNumber > 99) {
    return {
      isValid: false,
      errorMessage: 'DDD inválido. O DDD deve ter 2 dígitos entre 11 e 99.'
    };
  }

  // Verifica número
  const numberPart = cleaned.substring(2);
  if (numberPart.length < 8 || numberPart.length > 9) {
    return {
      isValid: false,
      errorMessage: 'Número inválido. Após o DDD, o número deve ter 8 ou 9 dígitos.'
    };
  }

  return {
    isValid: true,
    errorMessage: null
  };
};
