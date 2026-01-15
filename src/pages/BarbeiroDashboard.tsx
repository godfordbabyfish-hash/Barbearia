import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Clock, User, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications } from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationTester } from '@/components/NotificationTester';

const BarbeiroDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [currentUserBarber, setCurrentUserBarber] = useState<any>(null);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: '',
    barberId: '',
    date: '',
    time: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check if current user is a barber
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        toast.error('Erro ao verificar usuário');
        navigate('/auth');
        return;
      }
      
      if (!user) {
        console.log('No user found, redirecting to auth');
        navigate('/auth');
        return;
      }

      console.log('Current user ID:', user.id);
      
      // Load user's barber profile
      const { data: userBarber, error: barberError } = await supabase
        .from('barbers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (barberError) {
        console.error('Error loading user barber:', barberError);
      }
      
      if (userBarber) {
        console.log('User is a barber:', userBarber);
        setCurrentUserBarber(userBarber);
        setSelectedBarber(userBarber.id);
        toast.success(`Bem-vindo, ${userBarber.name}!`);
      } else {
        console.log('User is not a barber');
      }

      // Load all barbers
      const { data: barbersData, error: barbersError } = await supabase
        .from('barbers')
        .select('*')
        .eq('visible', true)
        .order('order_index');
      
      if (barbersError) {
        console.error('Error loading barbers:', barbersError);
      }
      
      if (barbersData && barbersData.length > 0) {
        console.log('Loaded barbers:', barbersData);
        setBarbers(barbersData);
        
        // Se não tem barbeiro selecionado e não é barbeiro, seleciona o primeiro
        if (!userBarber) {
          setSelectedBarber(barbersData[0].id);
        }
      }

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('visible', true)
        .order('order_index');
      
      if (servicesError) {
        console.error('Error loading services:', servicesError);
      }
      
      if (servicesData) {
        console.log('Loaded services:', servicesData);
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Error in loadData:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  useEffect(() => {
    if (selectedBarber) {
      loadAppointments();
    }
  }, [selectedBarber]);

  // Sistema de notificações com Service Worker
  const { isReady, showNotification } = useNotifications();

  // Escutar novos agendamentos em tempo real
  useEffect(() => {
    if (!selectedBarber) {
      console.log('⏸️ No barber selected, skipping realtime setup');
      return;
    }

    console.log('=================================');
    console.log('🔴 SETTING UP REALTIME SUBSCRIPTION');
    console.log('Selected Barber ID:', selectedBarber);
    console.log('Current time:', new Date().toISOString());
    console.log('=================================');
    
    const channelName = `appointments-barber-${selectedBarber}`;
    console.log('📡 Channel name:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `barber_id=eq.${selectedBarber}`
        },
        (payload) => {
          console.log('=================================');
          console.log('🎉 NEW APPOINTMENT RECEIVED!!!');
          console.log('Payload:', JSON.stringify(payload, null, 2));
          console.log('Time:', new Date().toISOString());
          console.log('=================================');
          
          // Processar imediatamente - sem setTimeout
          const processNotification = async () => {
            try {
              console.log('📥 Processing notification...');
              
              // Carregar dados do serviço e cliente
              console.log('Fetching service:', payload.new.service_id);
              const { data: service, error: serviceError } = await supabase
                .from('services')
                .select('title')
                .eq('id', payload.new.service_id)
                .single();
              
              console.log('Service result:', service, serviceError);
              
              console.log('Fetching client:', payload.new.client_id);
              const { data: client, error: clientError } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.client_id)
                .single();
              
              console.log('Client result:', client, clientError);
              
              const appointmentTime = payload.new.appointment_time?.substring(0, 5) || 'N/A';
              const appointmentDate = payload.new.appointment_date 
                ? new Date(payload.new.appointment_date).toLocaleDateString('pt-BR')
                : 'N/A';
              
              const notificationMessage = `Cliente: ${client?.name || 'Desconhecido'}\nServiço: ${service?.title || 'Desconhecido'}\nHorário: ${appointmentTime}\nData: ${appointmentDate}`;
              
              // Toast na interface
              toast.success('📅 Novo Agendamento!', {
                description: notificationMessage,
                duration: 10000,
              });
              
              // Notificação via Service Worker (funciona com tela bloqueada)
              console.log('📢 Tentando enviar notificação...');
              console.log('isReady:', isReady);
              console.log('showNotification exists:', !!showNotification);
              
              if (isReady && showNotification) {
                console.log('✅ Enviando notificação...');
                await showNotification('🔔 Novo Agendamento', {
                  body: notificationMessage,
                });
                console.log('✅ Notificação enviada!');
              } else {
                console.warn('⚠️ Sistema de notificações não está pronto:', { isReady, hasShowNotification: !!showNotification });
              }
              
              // Recarregar lista de agendamentos
              console.log('🔄 Reloading appointments...');
              loadAppointments();
              console.log('✅ Appointments reloaded!');
              
            } catch (error) {
              console.error('❌ Error processing notification:', error);
            }
          };
          
          processNotification();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to appointments channel!');
          toast.success('Sistema de notificações ativo', {
            description: 'Você será notificado de novos agendamentos',
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to channel!');
          toast.error('Erro ao ativar notificações');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out!');
          toast.error('Timeout ao ativar notificações');
        } else if (status === 'CLOSED') {
          console.log('🔴 Channel closed');
        }
      });

    return () => {
      console.log('=================================');
      console.log('🔴 CLEANING UP REALTIME SUBSCRIPTION');
      console.log('Channel:', channelName);
      console.log('=================================');
      supabase.removeChannel(channel);
    };
  }, [selectedBarber]);

  const loadAppointments = async () => {
    console.log('Loading appointments for barber:', selectedBarber);
    
    // Carregar appointments sem o join problemático
    const { data: appointmentsData, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(title, price, duration)
      `)
      .eq('barber_id', selectedBarber)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error loading appointments:', error);
      toast.error('Erro ao carregar agendamentos: ' + error.message);
      return;
    }
    
    console.log('Loaded appointments:', appointmentsData);
    
    if (appointmentsData && appointmentsData.length > 0) {
      // Carregar dados dos clientes separadamente
      const clientIds = [...new Set(appointmentsData.map(a => a.client_id))];
      const { data: clientsData } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', clientIds);
      
      console.log('Loaded clients:', clientsData);
      
      // Mapear clientes para appointments
      const appointmentsWithClients = appointmentsData.map(appointment => ({
        ...appointment,
        client: clientsData?.find(c => c.id === appointment.client_id) || null
      }));
      
      setAppointments(appointmentsWithClients);
      toast.success(`${appointmentsWithClients.length} agendamento(s) carregado(s)`);
    } else {
      setAppointments([]);
      toast.info('Nenhum agendamento encontrado');
    }
  };

  const handleCreateAppointment = async () => {
    if (!newAppointment.clientName || !newAppointment.clientPhone || 
        !newAppointment.serviceId || !newAppointment.barberId || 
        !newAppointment.date || !newAppointment.time) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Check for conflicts
    const selectedService = services.find(s => s.id === newAppointment.serviceId);
    const serviceDuration = selectedService?.duration || 30;

    const { data: existingAppointments } = await (supabase as any)
      .from('appointments')
      .select('appointment_time, service:services(duration)')
      .eq('barber_id', newAppointment.barberId)
      .eq('appointment_date', newAppointment.date)
      .neq('status', 'cancelled');

    // Check for time conflicts
    const hasConflict = existingAppointments?.some((apt: any) => {
      const aptDuration = apt.service?.duration || 30;
      const newEndTime = addMinutesToTime(newAppointment.time, serviceDuration);
      const aptEndTime = addMinutesToTime(apt.appointment_time, aptDuration);
      return (newAppointment.time < aptEndTime && newEndTime > apt.appointment_time);
    });

    if (hasConflict) {
      toast.error('Horário indisponível! Já existe um agendamento neste horário.');
      return;
    }

    // Criar perfil temporário para o cliente
    const { data: profileData, error: profileError } = await (supabase as any)
      .from('profiles')
      .insert([{
        name: newAppointment.clientName,
        phone: newAppointment.clientPhone,
      }])
      .select()
      .single();

    if (profileError) {
      toast.error('Erro ao criar perfil do cliente');
      return;
    }

    // Criar agendamento
    const { error } = await (supabase as any)
      .from('appointments')
      .insert([{
        client_id: profileData.id,
        barber_id: newAppointment.barberId,
        service_id: newAppointment.serviceId,
        appointment_date: newAppointment.date,
        appointment_time: newAppointment.time,
        status: 'confirmed',
      }]);

    if (error) {
      toast.error('Erro ao criar agendamento');
    } else {
      toast.success('Agendamento criado com sucesso!');
      setShowNewAppointment(false);
      setNewAppointment({
        clientName: '',
        clientPhone: '',
        serviceId: '',
        barberId: selectedBarber,
        date: '',
        time: '',
      });
      loadAppointments();
    }
  };

  const addMinutesToTime = (time: string, minutes: number) => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any)
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado');
      loadAppointments();
    }
  };

  const currentBarber = barbers.find(b => b.id === selectedBarber);

  const today = new Date().toISOString().split('T')[0];
  
  const todayAppointments = appointments.filter(a => {
    return a.appointment_date === today && (a.status === 'pending' || a.status === 'confirmed');
  });

  const todayCompleted = appointments.filter(a => {
    return a.appointment_date === today && a.status === 'completed';
  });

  const getWeekStart = () => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
  };

  const weekCompleted = appointments.filter(a => {
    return a.appointment_date >= getWeekStart() && a.status === 'completed';
  });

  const getMonthStart = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const monthCompleted = appointments.filter(a => {
    return a.appointment_date >= getMonthStart() && a.status === 'completed';
  });

  const upcomingAppointments = appointments.filter(a => {
    return a.appointment_date > today && (a.status === 'pending' || a.status === 'confirmed');
  });

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              Painel do <span className="bg-gradient-gold bg-clip-text text-transparent">Barbeiro</span>
            </h1>
            <div className="mt-4">
              <Label>Selecione o barbeiro:</Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name} - {barber.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Site
          </Button>
        </div>

        {currentBarber && (
          <>
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{todayAppointments.length}</p>
                  <p className="text-sm text-muted-foreground">pendentes</p>
                  <p className="text-xl font-bold text-green-500 mt-2">{todayCompleted.length}</p>
                  <p className="text-xs text-muted-foreground">finalizados</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    Semana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-500">{weekCompleted.length}</p>
                  <p className="text-sm text-muted-foreground">finalizados</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-500">{monthCompleted.length}</p>
                  <p className="text-sm text-muted-foreground">finalizados</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Avaliação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">⭐ {currentBarber.rating}</p>
                  <p className="text-sm text-muted-foreground">nota atual</p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6">
              <NotificationTester />
            </div>

            <div className="mb-6">
              <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Novo Agendamento</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Cliente</Label>
                      <Input
                        value={newAppointment.clientName}
                        onChange={(e) => setNewAppointment({ ...newAppointment, clientName: e.target.value })}
                        placeholder="João Silva"
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={newAppointment.clientPhone}
                        onChange={(e) => setNewAppointment({ ...newAppointment, clientPhone: e.target.value })}
                        placeholder="+55 11 99999-9999"
                      />
                    </div>
                    <div>
                      <Label>Serviço</Label>
                      <Select value={newAppointment.serviceId} onValueChange={(value) => setNewAppointment({ ...newAppointment, serviceId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.title} - R$ {service.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Barbeiro</Label>
                      <Select value={newAppointment.barberId || selectedBarber} onValueChange={(value) => setNewAppointment({ ...newAppointment, barberId: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {barbers.map((barber) => (
                            <SelectItem key={barber.id} value={barber.id}>
                              {barber.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={newAppointment.date}
                        onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Horário</Label>
                      <Input
                        type="time"
                        value={newAppointment.time}
                        onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateAppointment} className="flex-1">
                        Criar Agendamento
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {todayAppointments.length > 0 ? (
              <Card className="bg-card border-border mb-6">
                <CardHeader>
                  <CardTitle>Agendamentos de Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-bold text-lg">{appointment.service.title}</p>
                            <p className="text-sm font-medium">Cliente: {appointment.client?.name ?? 'Cliente'}</p>
                            {appointment.client?.phone ? (
                              <a 
                                href={`https://wa.me/${appointment.client.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                Tel: {appointment.client.phone}
                              </a>
                            ) : (
                              <p className="text-sm text-muted-foreground">Sem telefone</p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-bold text-primary">{appointment.appointment_time.slice(0, 5)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {appointment.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                                className="bg-primary"
                              >
                                Confirmar
                              </Button>
                            )}
                            {appointment.status === 'confirmed' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Concluir
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border mb-6">
                <CardHeader>
                  <CardTitle>Agendamentos de Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum agendamento para hoje
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Próximos Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                   {upcomingAppointments.map((appointment) => (
                     <div key={appointment.id} className="p-4 bg-secondary rounded-lg">
...
                     </div>
                   ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum agendamento futuro
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default BarbeiroDashboard;