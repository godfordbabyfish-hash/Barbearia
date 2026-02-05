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
import { LogOut, Calendar, Clock, Scissors, Sparkles, Wind, Home, ShoppingBag, History, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import haircutImg from "@/assets/service-haircut.jpg";
import beardImg from "@/assets/service-beard.jpg";
import stylingImg from "@/assets/service-styling.jpg";
import FilaDaBarbearia from '@/pages/FilaDaBarbearia';

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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  const [displayName, setDisplayName] = useState<string>('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);
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
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error('Supabase não configurado', {
        description: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para carregar o histórico.',
      });
      return;
    }
    loadDisplayName();
    loadAppointments();
    loadProductSales();
    loadServiceStats();
    loadServices();
  }, [user, role]);

  const loadDisplayName = async () => {
    if (!user) return;
    try {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('name, cpf')
        .eq('id', user.id)
        .maybeSingle();

      const nameFromProfile = data?.name?.trim() || '';
      const cpfFromProfile = data?.cpf || '';
      const nameFromMeta = (user as any)?.user_metadata?.name?.trim() || '';
      const fallbackName = user.email?.split('@')[0] || 'Usuário';
      const nameLooksLikeCpf =
        nameFromProfile && nameFromProfile.replace(/\D/g, '') === cpfFromProfile;

      setDisplayName(
        nameLooksLikeCpf
          ? (nameFromMeta || fallbackName)
          : (nameFromProfile || nameFromMeta || fallbackName)
      );
    } catch (error) {
      setDisplayName(user.email?.split('@')[0] || 'Usuário');
    }
  };

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

  const loadProductSales = async () => {
    if (!user) return;
    
    // Check if client_id column exists by trying to select it
    // If it doesn't exist, this might fail or return empty, so we handle gracefully
    try {
      const { data, error } = await supabase
        .from('product_sales')
        .select(`
          *,
          product:products(name, image_url),
          barber:barbers(name)
        `)
        .eq('client_id', user.id)
        .order('sale_date', { ascending: false });

      if (error) {
        console.log('Error loading product sales (column might not exist yet):', error);
      } else {
        setProductSales(data || []);
      }
    } catch (e) {
      console.error('Exception loading product sales:', e);
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
      return;
    }

    // Mostrar sucesso imediatamente
    toast.success('Agendamento cancelado com sucesso');
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
    setCancellationReason('');
    loadAppointments();

    // Processar fila de WhatsApp de forma assíncrona (não bloqueia a UI)
    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (supabaseUrl) {
          // Timeout de 3 segundos para não travar
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-process-queue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey || '',
              'Authorization': session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({}),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            console.log('✅ WhatsApp queue processed after cancellation');
          }
        }
      } catch (queueError: any) {
        // Silenciosamente falhar - não impacta o usuário
        if (queueError.name !== 'AbortError') {
          console.error('Error triggering WhatsApp queue:', queueError);
        }
      }
    }, 100); // Pequeno delay para não bloquear a UI
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
                  {(displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {displayName || 'Usuário'}
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
              <Button onClick={() => {
                navigate('/');
                setTimeout(() => {
                  const bookingSection = document.getElementById('agendamento');
                  if (bookingSection) {
                    const yOffset = -80;
                    const y = bookingSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }, 300);
              }} className="bg-primary">
                Novo Agendamento
              </Button>
              <Button onClick={() => navigate('/configuracoes')} variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
              <Button onClick={signOut} variant="outline" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="agendamentos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="fila">Fila</TabsTrigger>
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
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <Scissors className="h-4 w-4" />
                  Serviços
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Produtos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="services">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-primary" />
                      Histórico de Serviços
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
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-lg">{appointment.service.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(appointment.appointment_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                  <Clock className="h-3 w-3 ml-2" />
                                  {appointment.appointment_time.slice(0, 5)}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Barbeiro: {appointment.barber?.name || 'Não informado'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                  appointment.status === 'completed' ? 'bg-green-500/20 text-green-500 border-green-500/50' :
                                  appointment.status === 'confirmed' ? 'bg-blue-500/20 text-blue-500 border-blue-500/50' :
                                  appointment.status === 'cancelled' ? 'bg-red-500/20 text-red-500 border-red-500/50' :
                                  'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                }`}>
                                  {appointment.status === 'completed' ? 'Concluído' :
                                   appointment.status === 'confirmed' ? 'Confirmado' :
                                   appointment.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                </span>
                                <span className="font-bold text-primary">
                                  R$ {appointment.service.price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            
                            {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                              <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                                  onClick={() => handleCancelClick(appointment.id)}
                                >
                                  Cancelar Agendamento
                                </Button>
                              </div>
                            )}
                          </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhum serviço encontrado no histórico</p>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="products">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                      Histórico de Compras
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {productSales.length > 0 ? (
                        productSales.map((sale) => (
                          <div key={sale.id} className="p-4 bg-secondary rounded-lg">
                            <div className="flex gap-4">
                              <div className="h-16 w-16 bg-background rounded-md overflow-hidden flex-shrink-0">
                                {sale.product?.image_url ? (
                                  <img 
                                    src={sale.product.image_url} 
                                    alt={sale.product.name} 
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-secondary">
                                    <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-bold">{sale.product?.name || 'Produto'}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(sale.sale_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                      <Clock className="h-3 w-3 ml-2" />
                                      {sale.sale_time?.slice(0, 5)}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Vendedor: {sale.barber?.name || 'Não informado'}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                      sale.status === 'confirmed' ? 'bg-green-500/20 text-green-500 border-green-500/50' :
                                      sale.status === 'cancelled' ? 'bg-red-500/20 text-red-500 border-red-500/50' :
                                      'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                    }`}>
                                      {sale.status === 'confirmed' ? 'Confirmado' :
                                       sale.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                    </span>
                                    <div className="text-right">
                                      <span className="font-bold text-primary block">
                                        R$ {sale.total_price.toFixed(2)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {sale.quantity}x R$ {sale.unit_price.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>Nenhuma compra de produto encontrada</p>
                          <Button 
                            variant="link" 
                            className="text-primary mt-2"
                            onClick={() => navigate('/shop')}
                          >
                            Ir para o Shop
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="fila" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Fila da Barbearia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <FilaDaBarbearia readOnly />
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
