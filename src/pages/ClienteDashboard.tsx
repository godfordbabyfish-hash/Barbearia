import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogOut, Calendar, Clock, Scissors, Sparkles, Wind, Home, ShoppingBag } from 'lucide-react';
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

  const handleCancelAppointment = async (id: string) => {
    const { error } = await (supabase as any)
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao cancelar agendamento');
    } else {
      toast.success('Agendamento cancelado');
      loadAppointments();
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            Meus <span className="bg-gradient-gold bg-clip-text text-transparent">Agendamentos</span>
          </h1>
          <div className="flex gap-2">
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
            <Button onClick={signOut} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

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

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Histórico de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {appointments.map((appointment) => (
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
                    </div>
                    {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleCancelAppointment(appointment.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {appointments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Você ainda não tem agendamentos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClienteDashboard;
