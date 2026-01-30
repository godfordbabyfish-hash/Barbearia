/**
 * Gera um UUID v4 compatível com todos os navegadores
 * Tenta usar crypto.randomUUID() se disponível, senão usa fallback
 */
export const generateUUID = (): string => {
  // Tentar usar crypto.randomUUID se disponível (navegadores modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback para navegadores que não suportam crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Gera um UUID v4 usando crypto.getRandomValues se disponível
 * Mais seguro que Math.random() mas ainda compatível
 */
export const generateSecureUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Usar crypto.getRandomValues para maior segurança
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Definir versão (4) e variante
    array[6] = (array[6] & 0x0f) | 0x40; // versão 4
    array[8] = (array[8] & 0x3f) | 0x80; // variante RFC 4122
    
    // Converter para string UUID
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }
  
  // Fallback final usando Math.random()
  return generateUUID();
};