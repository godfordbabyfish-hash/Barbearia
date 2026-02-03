# Correção Urgente - BarbeiroDashboard.tsx

## Problema
O arquivo `src/pages/BarbeiroDashboard.tsx` está com estrutura JSX corrompida após as modificações.

## Solução Imediata

### 1. Fazer backup do arquivo atual:
```bash
cp src/pages/BarbeiroDashboard.tsx src/pages/BarbeiroDashboard.tsx.backup
```

### 2. Restaurar de um commit anterior:
```bash
git checkout HEAD~1 -- src/pages/BarbeiroDashboard.tsx
```

### 3. Aplicar apenas as mudanças necessárias:

**Substituir a seção de agendamentos (linhas ~1640-1800) por:**

```tsx
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Agendamentos por Barbeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {appointmentsByBarber.length > 0 ? (
                  <div className="space-y-6">
                    {appointmentsByBarber.map(({ barber, appointments, todayCount, upcomingCount }) => (
                      <div key={barber.id} className="border border-border rounded-lg p-4 bg-secondary/30">
                        {/* Header do Barbeiro */}
                        <div className="flex items-center gap-4 mb-4 pb-3 border-b border-border">
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={barber.photo_url || ''} alt={barber.name} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                              {barber.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{barber.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Hoje: {todayCount}</span>
                              <span>Próximos: {upcomingCount}</span>
                              <span>Total: {appointments.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Lista de Agendamentos */}
                        {appointments.length > 0 ? (
                          <div className="space-y-3">
                            {appointments.map((appointment) => {
                              const clientName = appointment.client?.name ?? 'Cliente';
                              const appointmentTime = appointment.appointment_time.slice(0, 5);
                              const today = new Date().toISOString().split('T')[0];
                              const isToday = appointment.appointment_date === today;

                              return (
                                <div 
                                  key={appointment.id} 
                                  className={`p-3 rounded-lg border cursor-pointer ${
                                    isToday ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
                                  }`}
                                  onClick={() => handleAppointmentClick(appointment)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarFallback>
                                        {clientName.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="font-semibold text-sm">{appointment.service?.title || 'Serviço'}</p>
                                      <p className="text-xs text-muted-foreground">Cliente: {clientName}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs">
                                          {isToday ? 'HOJE' : appointment.appointment_date} às {appointmentTime}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                          appointment.booking_type === 'local' ? 'bg-blue-500/20 text-blue-400' :
                                          appointment.booking_type === 'manual' ? 'bg-orange-500/20 text-orange-400' :
                                          'bg-green-500/20 text-green-400'
                                        }`}>
                                          {appointment.booking_type === 'local' ? 'Local' : 
                                           appointment.booking_type === 'manual' ? 'Manual' : 'Online'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            Nenhum agendamento para este barbeiro
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum agendamento encontrado
                  </p>
                )}
              </CardContent>
            </Card>
```

### 4. Adicionar a função de agrupamento (antes do return):

```tsx
  // Agrupar agendamentos por barbeiro
  const getAppointmentsByBarber = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const relevantAppointments = appointments
      .filter(a => {
        const isToday = a.appointment_date === today;
        const isFuture = a.appointment_date > today;
        const isActiveStatus = a.status === 'pending' || a.status === 'confirmed';
        return (isToday || isFuture) && isActiveStatus;
      })
      .sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) {
          return a.appointment_date.localeCompare(b.appointment_date);
        }
        return a.appointment_time.localeCompare(b.appointment_time);
      });

    const appointmentsByBarber = barbers.map(barber => {
      const barberAppointments = relevantAppointments.filter(a => a.barber_id === barber.id);
      return {
        barber,
        appointments: barberAppointments,
        todayCount: barberAppointments.filter(a => a.appointment_date === today).length,
        upcomingCount: barberAppointments.filter(a => a.appointment_date > today).length
      };
    });

    return appointmentsByBarber.sort((a, b) => {
      if (a.todayCount > 0 && b.todayCount === 0) return -1;
      if (a.todayCount === 0 && b.todayCount > 0) return 1;
      return a.barber.name.localeCompare(b.barber.name);
    });
  };

  const appointmentsByBarber = getAppointmentsByBarber();
```

### 5. Adicionar import:
```tsx
import { Users } from 'lucide-react';
```

## Resultado
- ✅ Estrutura JSX correta
- ✅ Agendamentos agrupados por barbeiro
- ✅ Visual limpo e organizado
- ✅ Funcionalidade mantida

Execute essas correções manualmente para restaurar o funcionamento.