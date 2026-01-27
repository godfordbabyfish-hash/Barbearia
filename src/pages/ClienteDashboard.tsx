import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LogOut, Calendar, Clock, Scissors, Sparkles, Wind, Home, ShoppingBag, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import haircutImg from "@/assets/service-haircut.jpg";
import beardImg from "@/assets/service-beard.jpg";
import stylingImg from "@/assets/service-styling.jpg";

const iconMap: Record<string, any> = {
  Scissors,
  Wind,
  Sparkles,
};

const defaultImages: Record<string, string> = {
  "Corte de Cabelo": haircutImg,
  "Barba & Bigode": beardImg,
  "Finalização": stylingImg,
};

const ClienteDashboard = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [serviceStats, setServiceStats] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'all' | 'completed' | 'cancelled' | 'confirmed' | 'pending'>('all');
  const [historyFilterService, setHistoryFilterService] = useState<string>('all');

  useEffect(() => {
    if (!user || role !== 'cliente') {
      navigate('/auth');
      return;
    }
    loadAppointments();
    loadServiceStats();
    loadServices();
  }, [user, role]);

  const loadAppointments = async () => {
    const { data, error } = await (supabase as any)
      .from('appointments')
      .select(`
        *,
        service:services(title, price),
        barber:barbers(name)
      `)
      .eq('client_id', user?.id)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.error('Error loading appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } else {
      console.log('Loaded appointments:', data);
      setAppointments(data || []);
    }
  };

  const loadServiceStats = async () => {
    const { data, error } = await (supabase as any)
      .from('appointments')
      .select(`
        service_id,
        service:services(title)
      `)
      .eq('client_id', user?.id)
      .eq('status', 'completed');

    if (error) {
      console.error('Error loading stats:', error);
    } else {
      // Count occurrences of each service
      const stats = data?.reduce((acc: any, curr: any) => {
        const serviceTitle = curr.service.title;
        acc[serviceTitle] = (acc[serviceTitle] || 0) + 1;
        return acc;
      }, {});

      const statsArray = Object.entries(stats || {}).map(([title, count]) => ({
        title,
        count,
      })).sort((a: any, b: any) => b.count - a.count);

      setServiceStats(statsArray);
    }
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('visible', true)
      .order('order_index');

    if (error) {
      console.error('Error loading services:', error);
    } else {
      setServices(data || []);
    }
  };

  // Função para filtrar agendamentos do histórico
  const getFilteredHistoryAppointments = () => {
    let filtered = [...appointments];

    // Filtro por período
    if (historyFilterPeriod !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.appointment_date + 'T00:00:00');
        aptDate.setHours(0, 0, 0, 0);
        
        switch (historyFilterPeriod) {
          case 'today':
            return aptDate.getTime() === today.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return aptDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return aptDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return aptDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Filtro por status
    if (historyFilterStatus !== 'all') {
      filtered = filtered.filter(apt => apt.status === historyFilterStatus);
    }

    // Filtro por serviço
    if (historyFilterService !== 'all') {
      filtered = filtered.filter(apt => apt.service_id === historyFilterService);
    }

    return filtered;
  };

  const handleCancelClick = (id: string) => {
    setAppointmentToCancel(id);
    setCancellationReason('');
    setCancelDialogOpen(true);
  };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    if (!cancellationReason.trim()) {
      toast.error('Por favor, informe o motivo do cancelamento');
      return;
    }

    const { error } = await (supabase as any)
      .from('appointments')
      .update({ 
        status: 'cancelled',
        notes: `[Cancelado pelo cliente] ${cancellationReason.trim()}`
      })
      .eq('id', appointmentToCancel);

    if (error) {
      toast.error('Erro ao cancelar agendamento');
    } else {
      // O trigger do banco de dados já deve ter adicionado a notificação na fila
      // Mas vamos garantir que a fila seja processada após o cancelamento
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (supabaseUrl) {
          // Disparar processamento da fila de WhatsApp (cliente + barbeiro)
          const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-process-queue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey || '',
              'Authorization': session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            console.error('Error triggering WhatsApp queue after cancellation:', response.status);
          } else {
            console.log('WhatsApp queue processed after cancellation');
          }
        }
      } catch (queueError) {
        console.error('Error triggering WhatsApp queue after cancellation:', queueError);
        // Não bloquear o fluxo do usuário se a fila falhar
      }

      toast.success('Agendamento cancelado com sucesso');
      setCancelDialogOpen(false);
      setAppointmentToCancel(null);
      setCancellationReason('');
      loadAppointments();
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold">
            Meus <span className="bg-gradient-gold bg-clip-text text-transparent">Agendamentos</span>
          </h1>
          <div className="flex flex-col gap-2 md:items-end">
            {user && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {user.email || 'Usuário'}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              <Button onClick={() => navigate('/')} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Início
              </Button>
              <Button onClick={() => navigate('/shop')} variant="outline">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Shop
              </Button>
              <Button onClick={() => navigate('/#agendamento')} className="bg-primary">
                Novo Agendamento
              </Button>
              <Button onClick={signOut} variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="agendamentos" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="agendamentos" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-primary" />
                    Serviços Mais Usados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {serviceStats.length > 0 ? (
                    <div className="space-y-3">
                      {serviceStats.map((stat: any) => (
                        <div key={stat.title} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                          <span className="font-medium">{stat.title}</span>
                          <span className="text-primary font-bold">{stat.count}x</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum serviço concluído ainda</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Próximo Agendamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')[0] ? (
                    <div className="space-y-2">
                      <p className="font-bold text-lg">
                        {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')[0].service.title}
                      </p>
                      <p className="text-muted-foreground">
                        {format(new Date(appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')[0].appointment_date), "dd 'de' MMMM", { locale: ptBR })} às {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')[0].appointment_time.slice(0, 5)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Com {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')[0].barber.name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum agendamento futuro</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Services Section */}
            {services.length > 0 && (
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-6">
                  Nossos <span className="bg-gradient-gold bg-clip-text text-transparent">Serviços</span>
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {services.map((service) => {
                    const Icon = iconMap[service.icon] || Scissors;
                    const imageUrl = service.image_url || defaultImages[service.title] || haircutImg;
                    
                    return (
                      <Card 
                        key={service.id} 
                        className="group overflow-hidden border-border hover:border-primary transition-all duration-300 hover:shadow-gold cursor-pointer"
                        onClick={() => navigate('/', { state: { preSelectedService: service, scrollToBooking: true } })}
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
                          <div className="absolute bottom-3 left-3">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
                            <Icon className="w-5 h-5" />
                            {service.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-3">
                            {service.description}
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            R$ {service.price.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Histórico de Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-4 border-b border-border">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Período</Label>
                    <Select value={historyFilterPeriod} onValueChange={(v) => setHistoryFilterPeriod(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Última Semana</SelectItem>
                        <SelectItem value="month">Último Mês</SelectItem>
                        <SelectItem value="year">Último Ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Status</Label>
                    <Select value={historyFilterStatus} onValueChange={(v) => setHistoryFilterStatus(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Serviço</Label>
                    <Select value={historyFilterService} onValueChange={setHistoryFilterService}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>{service.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  {(() => {
                    const filteredAppointments = getFilteredHistoryAppointments();
                    return filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 bg-secondary rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-bold text-lg">{appointment.service.title}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(appointment.appointment_date), "dd/MM/yyyy")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {appointment.appointment_time.slice(0, 5)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Com {appointment.barber.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Cliente: {user?.user_metadata?.name || 'Você'}
                            </p>
                            <p className="text-sm">
                              <span className={`px-2 py-1 rounded ${
                                appointment.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                appointment.status === 'confirmed' ? 'bg-blue-500/20 text-blue-500' :
                                appointment.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                                'bg-primary/20 text-primary'
                              }`}>
                                {appointment.status === 'completed' ? 'Concluído' :
                                 appointment.status === 'confirmed' ? 'Confirmado' :
                                 appointment.status === 'cancelled' ? 'Cancelado' :
                                 'Agendamento Efetuado'}
                              </span>
                            </p>
                            {appointment.status === 'completed' && appointment.photo_url && (
                              <div className="mt-3">
                                <img 
                                  src={appointment.photo_url} 
                                  alt="Foto do corte" 
                                  className="w-full max-w-xs h-48 object-cover rounded-lg border border-border"
                                />
                              </div>
                            )}
                          </div>
                          {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleCancelClick(appointment.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {appointments.length === 0 
                          ? 'Você ainda não tem agendamentos'
                          : 'Nenhum agendamento encontrado com os filtros selecionados'}
                      </p>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog para cancelar agendamento */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancelar Agendamento</DialogTitle>
              <DialogDescription>
                Informe o motivo do cancelamento:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              
              <div>
                <Label htmlFor="cancellation-reason">Motivo do Cancelamento *</Label>
                <Textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Ex: Preciso remarcar para outro horário, Impedimento de última hora, etc."
                  className="mt-2 min-h-[100px]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setCancelDialogOpen(false);
                    setAppointmentToCancel(null);
                    setCancellationReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleCancelAppointment}
                  variant="destructive"
                  className="flex-1"
                >
                  Confirmar Cancelamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ClienteDashboard;
