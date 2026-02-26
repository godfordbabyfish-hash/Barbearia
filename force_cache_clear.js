// Script para limpar cache e forçar atualização dos dados de agendamento
// Execute no console do navegador ou no ambiente de desenvolvimento

// 1. Limpar localStorage relacionado a agendamentos
if (typeof window !== 'undefined') {
  console.log('Limpando cache de agendamentos...');
  
  // Limpar chaves específicas do sistema de agendamento
  const keysToClear = [
    'booking-data',
    'available-slots',
    'barber-availability',
    'operating-hours',
    'selected-date',
    'selected-barber'
  ];
  
  keysToClear.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  // Limpar todo o localStorage se necessário
  // localStorage.clear();
  
  console.log('Cache limpo. Recarregando dados...');
  
  // 2. Forçar reload da página para limpar cache
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

// 3. Para servidor: Limpar caches Redis/Database se aplicável
// Isso deve ser executado no backend
