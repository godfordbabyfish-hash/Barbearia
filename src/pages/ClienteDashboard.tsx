import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LogOut, Calendar, Clock, Scissors, Sparkles, Wind, Home, ShoppingBag, History, Settings, Filter } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import haircutImg from "@/assets/service-haircut.jpg";
import beardImg from "@/assets/service-beard.jpg";
import stylingImg from "@/assets/service-styling.jpg";
import FilaDaBarbearia from '@/pages/FilaDaBarbearia';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

type HistoryFilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year';
type HistoryFilterStatus = 'all' | 'completed' | 'cancelled' | 'confirmed' | 'pending';
type ServiceRecord = Tables<'services'>;
type ProductRecord = Tables<'products'>;
type BarberRecord = Tables<'barbers'>;
type AppointmentRecord = Tables<'appointments'>;
type AppointmentPaymentRecord = Tables<'appointment_payments'>;
type ProductSaleRecord = Tables<'product_sales'>;
type AppointmentDerivedStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
type UserMetadata = {
  name?: string;
  avatar_url?: string;
};
type AppointmentWithRelations = AppointmentRecord & {
  service: Pick<ServiceRecord, 'title' | 'price'> | null;
  barber: Pick<BarberRecord, 'name'> | null;
};
type AppointmentStatRecord = Pick<
  AppointmentRecord,
  'id' | 'service_id' | 'appointment_date' | 'appointment_time' | 'status' | 'photo_url' | 'payment_method'
> & {
  service: Pick<ServiceRecord, 'title'> | null;
};
type AppointmentHistoryItem = AppointmentWithRelations & {
  _derivedStatus: AppointmentDerivedStatus;
};
type ActiveAppointmentItem = AppointmentHistoryItem & {
  _dateTime: Date;
};
type ProductSaleWithRelations = ProductSaleRecord & {
  product: Pick<ProductRecord, 'name' | 'image_url'> | null;
  barber: Pick<BarberRecord, 'name'> | null;
};
type ServiceStat = {
  title: string;
  count: number;
};
type AppointmentRealtimePayload = {
  new?: { status?: AppointmentRecord['status'] | null } | null;
  old?: { status?: AppointmentRecord['status'] | null } | null;
};
type QueueError = {
  name?: string;
};

const iconMap: Record<string, LucideIcon> = {
  Scissors,
  Wind,
  Sparkles,
};

const defaultImages: Record<string, string> = {
  "Corte de Cabelo": haircutImg,
  "Barba & Bigode": beardImg,
  "Finalização": stylingImg,
};

const getOptimizedStorageImageUrl = (
  imageUrl?: string | null,
  options?: { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' }
) => {
  if (!imageUrl) return '';

  try {
    const parsed = new URL(imageUrl);
    const objectPathMarker = '/storage/v1/object/public/';
    const markerIndex = parsed.pathname.indexOf(objectPathMarker);

    if (markerIndex === -1) {
      return imageUrl;
    }

    const objectPath = parsed.pathname.slice(markerIndex + objectPathMarker.length);
    const prefix = parsed.pathname.slice(0, markerIndex);
    parsed.pathname = `${prefix}/storage/v1/render/image/public/${objectPath}`;

    parsed.searchParams.set('width', String(options?.width ?? 240));
    if (options?.height) {
      parsed.searchParams.set('height', String(options.height));
    } else {
      parsed.searchParams.delete('height');
    }
    parsed.searchParams.set('quality', String(options?.quality ?? 65));
    parsed.searchParams.set('resize', options?.resize ?? 'cover');
    return parsed.toString();
  } catch {
    return imageUrl;
  }
};

const historyFilterPeriods: readonly HistoryFilterPeriod[] = ['all', 'today', 'week', 'month', 'year'];
const historyFilterStatuses: readonly HistoryFilterStatus[] = ['all', 'completed', 'cancelled', 'confirmed', 'pending'];
const CLIENT_HISTORY_PAGE_SIZE = 30;

const getUserMetadata = (user: User | null | undefined): UserMetadata =>
  (user?.user_metadata ?? {}) as UserMetadata;

const isHistoryFilterPeriod = (value: string): value is HistoryFilterPeriod =>
  (historyFilterPeriods as readonly string[]).includes(value);

const isHistoryFilterStatus = (value: string): value is HistoryFilterStatus =>
  (historyFilterStatuses as readonly string[]).includes(value);

const getAppointmentDateTime = (
  appointment: Pick<AppointmentRecord, 'appointment_date' | 'appointment_time'>
) => {
  const time = (appointment.appointment_time || '00:00').slice(0, 5);
  return new Date(`${appointment.appointment_date}T${time}:00`);
};

const getDerivedAppointmentStatus = (
  appointment: Pick<AppointmentRecord, 'status' | 'photo_url' | 'payment_method'>
): AppointmentDerivedStatus => {
  const hasImplicitCompletion = Boolean(appointment.photo_url) || Boolean(appointment.payment_method);

  if (appointment.status === 'cancelled') {
    return 'cancelled';
  }

  if (appointment.status === 'completed' || hasImplicitCompletion) {
    return 'completed';
  }

  if (appointment.status === 'confirmed') {
    return 'confirmed';
  }

  return 'pending';
};

const ClienteDashboard = () => {
  const { user, role, blocked, signOut } = useAuth();
  const navigate = useNavigate();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [displayName, setDisplayName] = useState<string>('');
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [productSales, setProductSales] = useState<ProductSaleWithRelations[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStat[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<HistoryFilterPeriod>('all');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<HistoryFilterStatus>('all');
  const [historyFilterService, setHistoryFilterService] = useState<string>('all');
  const [historyTab, setHistoryTab] = useState<'services' | 'products'>('services');
  const [historyAppointments, setHistoryAppointments] = useState<AppointmentHistoryItem[]>([]);
  const [historyAppointmentsTotalCount, setHistoryAppointmentsTotalCount] = useState(0);
  const [historyAppointmentsPage, setHistoryAppointmentsPage] = useState(1);
  const [loadingHistoryAppointments, setLoadingHistoryAppointments] = useState(false);
  const [productHistoryTotalCount, setProductHistoryTotalCount] = useState(0);
  const [productHistoryPage, setProductHistoryPage] = useState(1);
  const [serviceSearch, setServiceSearch] = useState('');
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);
  const [serviceStatsLoaded, setServiceStatsLoaded] = useState(false);

  const historyTotalPages = Math.max(1, Math.ceil(historyAppointmentsTotalCount / CLIENT_HISTORY_PAGE_SIZE));
  const currentHistoryPage = Math.min(historyAppointmentsPage, historyTotalPages);
  const historyStartIndex = historyAppointmentsTotalCount === 0 ? 0 : (currentHistoryPage - 1) * CLIENT_HISTORY_PAGE_SIZE + 1;
  const historyEndIndex = Math.min(currentHistoryPage * CLIENT_HISTORY_PAGE_SIZE, historyAppointmentsTotalCount);

  const productHistoryTotalPages = Math.max(1, Math.ceil(productHistoryTotalCount / CLIENT_HISTORY_PAGE_SIZE));
  const currentProductHistoryPage = Math.min(productHistoryPage, productHistoryTotalPages);
  const productHistoryStartIndex = productHistoryTotalCount === 0 ? 0 : (currentProductHistoryPage - 1) * CLIENT_HISTORY_PAGE_SIZE + 1;
  const productHistoryEndIndex = Math.min(currentProductHistoryPage * CLIENT_HISTORY_PAGE_SIZE, productHistoryTotalCount);

  const completedCount = appointments.filter((a) => getDerivedAppointmentStatus(a) === 'completed').length;
  const upcomingCount = appointments.filter((a) => {
    const st = getDerivedAppointmentStatus(a);
    return st === 'pending' || st === 'confirmed';
  }).length;

  const handleQuickBookForService = (serviceTitle: string) => {
    const svc = services.find((s) => s.title === serviceTitle);
    if (svc) {
      navigate('/', { state: { preSelectedService: { id: svc.id, title: svc.title, price: svc.price } } });
      setTimeout(() => {
        const bookingSection = document.getElementById('agendamento');
        if (bookingSection) bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } else {
      navigate('/');
      setTimeout(() => {
        const bookingSection = document.getElementById('agendamento');
        if (bookingSection) bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  };

  const loadDisplayName = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name, cpf, photo_url')
        .eq('id', user.id)
        .maybeSingle();

      const userMetadata = getUserMetadata(user);
      const nameFromProfile = data?.name?.trim() || '';
      const cpfFromProfile = data?.cpf || '';
      const nameFromMeta = userMetadata.name?.trim() || '';
      const fallbackName = user.email?.split('@')[0] || 'Usuário';
      const nameLooksLikeCpf =
        nameFromProfile && nameFromProfile.replace(/\D/g, '') === cpfFromProfile;

      setDisplayName(
        nameLooksLikeCpf
          ? (nameFromMeta || fallbackName)
          : (nameFromProfile || nameFromMeta || fallbackName)
      );
      setProfilePhotoUrl((data?.photo_url as string) || null);
    } catch (error) {
      setDisplayName(user.email?.split('@')[0] || 'Usuário');
      setProfilePhotoUrl(null);
    }
  }, [user]);

  const loadAppointments = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(title, price),
        barber:barbers(name)
      `)
      .eq('client_id', user.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Error loading appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } else {
      try {
        const base = (data || []) as AppointmentWithRelations[];
        const ids = base.map((appointment) => appointment.id);
        if (ids.length > 0) {
          const { data: pays } = await supabase
            .from('appointment_payments')
            .select('appointment_id')
            .in('appointment_id', ids);
          const paidIds = new Set((pays || []).map((payment: Pick<AppointmentPaymentRecord, 'appointment_id'>) => payment.appointment_id));
          const reconciled = base.map((appointment) => {
            const hasImplicitCompletion = Boolean(appointment.photo_url) || Boolean(appointment.payment_method);
            if ((paidIds.has(appointment.id) || hasImplicitCompletion) && appointment.status !== 'completed') {
              return { ...appointment, status: 'completed' as const };
            }
            return appointment;
          });
          setAppointments(reconciled);
        } else {
          setAppointments(base);
        }
      } catch {
        setAppointments(data || []);
      }
    }
    setAppointmentsLoaded(true);
  }, [user]);

  const loadProductSales = useCallback(async (page: number = 1) => {
    if (!user) return;
    try {
      const safePage = Math.max(1, page);
      const rangeFrom = (safePage - 1) * CLIENT_HISTORY_PAGE_SIZE;
      const rangeTo = rangeFrom + CLIENT_HISTORY_PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('product_sales')
        .select(`
          *,
          product:products(name, image_url),
          barber:barbers(name)
        `, { count: 'exact' })
        .eq('client_id', user.id)
        .order('sale_date', { ascending: false })
        .order('sale_time', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (error) {
        console.log('Error loading product sales (column might not exist yet):', error);
      } else {
        setProductSales((data || []) as ProductSaleWithRelations[]);
        setProductHistoryTotalCount(count ?? 0);
      }
    } catch (e) {
      console.error('Exception loading product sales:', e);
    }
  }, [user]);

  const loadHistoryAppointments = useCallback(async (page: number = 1) => {
    if (!user) return;

    setLoadingHistoryAppointments(true);
    try {
      const safePage = Math.max(1, page);
      const rangeFrom = (safePage - 1) * CLIENT_HISTORY_PAGE_SIZE;
      const rangeTo = rangeFrom + CLIENT_HISTORY_PAGE_SIZE - 1;

      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          booking_type,
          status,
          notes,
          client_id,
          barber_id,
          service_id,
          payment_method,
          photo_url,
          service:services(title, price),
          barber:barbers(name)
        `, { count: 'exact' })
        .eq('client_id', user.id);

      if (historyFilterService !== 'all') {
        query = query.eq('service_id', historyFilterService);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (historyFilterPeriod !== 'all') {
        if (historyFilterPeriod === 'today') {
          const todayStr = format(today, 'yyyy-MM-dd');
          query = query.eq('appointment_date', todayStr);
        } else {
          const fromDate = new Date(today);
          if (historyFilterPeriod === 'week') {
            fromDate.setDate(fromDate.getDate() - 7);
          } else if (historyFilterPeriod === 'month') {
            fromDate.setMonth(fromDate.getMonth() - 1);
          } else if (historyFilterPeriod === 'year') {
            fromDate.setFullYear(fromDate.getFullYear() - 1);
          }
          query = query.gte('appointment_date', format(fromDate, 'yyyy-MM-dd'));
        }
      }

      if (historyFilterStatus !== 'all') {
        if (historyFilterStatus === 'completed') {
          query = query.or('status.eq.completed,payment_method.not.is.null,photo_url.not.is.null');
        } else {
          query = query.eq('status', historyFilterStatus);
        }
      }

      const { data, error, count } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(rangeFrom, rangeTo);

      if (error) {
        console.error('Error loading history appointments:', error);
        toast.error('Erro ao carregar histórico de serviços');
        setHistoryAppointments([]);
        setHistoryAppointmentsTotalCount(0);
        return;
      }

      const withDerived = ((data || []) as AppointmentWithRelations[]).map((appointment) => ({
        ...appointment,
        _derivedStatus: getDerivedAppointmentStatus(appointment),
      }));

      setHistoryAppointments(withDerived);
      setHistoryAppointmentsTotalCount(count ?? 0);
    } catch (error) {
      console.error('Unexpected error loading history appointments:', error);
      setHistoryAppointments([]);
      setHistoryAppointmentsTotalCount(0);
    } finally {
      setLoadingHistoryAppointments(false);
    }
  }, [user, historyFilterPeriod, historyFilterService, historyFilterStatus]);

  const loadServiceStats = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        service_id,
        appointment_date,
        appointment_time,
        status,
        photo_url,
        payment_method,
        service:services(title)
      `)
      .eq('client_id', user.id)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error loading stats:', error);
    } else {
      const counts: Record<string, number> = {};
      ((data || []) as AppointmentStatRecord[]).forEach((appointment) => {
        const derivedCompleted = getDerivedAppointmentStatus(appointment) === 'completed';
        if (!derivedCompleted) return;
        const title = appointment.service?.title || 'Serviço';
        counts[title] = (counts[title] || 0) + 1;
      });
      
      const statsArray = Object.entries(counts).map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count);
      
      setServiceStats(statsArray);
    }
    setServiceStatsLoaded(true);
  }, [user]);

  const loadServices = useCallback(async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('visible', true)
      .order('order_index');

    if (error) {
      console.error('Error loading services:', error);
    } else {
      setServices((data || []) as ServiceRecord[]);
    }
  }, []);

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
    loadServiceStats();
    loadServices();
  }, [user, role, navigate, supabaseAnonKey, supabaseUrl, loadAppointments, loadDisplayName, loadServiceStats, loadServices]);

  useEffect(() => {
    if (!user) return;

    if (historyTab === 'services') {
      loadHistoryAppointments(historyAppointmentsPage);
      return;
    }

    loadProductSales(productHistoryPage);
  }, [user, historyTab, historyAppointmentsPage, productHistoryPage, loadHistoryAppointments, loadProductSales]);

  useEffect(() => {
    setHistoryAppointmentsPage(1);
  }, [historyFilterPeriod, historyFilterStatus, historyFilterService]);

  useEffect(() => {
    if (historyAppointmentsPage > historyTotalPages) {
      setHistoryAppointmentsPage(historyTotalPages);
    }
  }, [historyAppointmentsPage, historyTotalPages]);

  useEffect(() => {
    if (productHistoryPage > productHistoryTotalPages) {
      setProductHistoryPage(productHistoryTotalPages);
    }
  }, [productHistoryPage, productHistoryTotalPages]);

  useEffect(() => {
    if (!user) return;
    let removed = false;
    const channel = supabase
      .channel(`client-appointments-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `client_id=eq.${user.id}`
        },
        (payload: AppointmentRealtimePayload) => {
          const status = payload.new?.status || payload.old?.status;
          if (status === 'completed') {
            toast.success('Atendimento concluído', {
              description: 'Seu agendamento foi atualizado para concluído.',
              duration: 2500,
            });
          }
          if (status === 'cancelled') {
            toast.warning('Agendamento cancelado', {
              description: 'Um agendamento seu foi cancelado.',
              duration: 2500,
            });
          }
          loadAppointments();
          loadHistoryAppointments(historyAppointmentsPage);
          loadServiceStats();
        }
      )
      .subscribe((status: string) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !removed) {
          removed = true;
          setTimeout(() => { try { supabase.removeChannel(channel); } catch { /* ignore */ } }, 0);
        }
      });
    return () => {
      removed = true;
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
  }, [user, loadAppointments, loadHistoryAppointments, historyAppointmentsPage, loadServiceStats]);

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

    const { error } = await supabase
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
      } catch (queueError: unknown) {
        const typedQueueError = queueError as QueueError;
        if (typedQueueError.name !== 'AbortError') {
          console.error('Error triggering WhatsApp queue:', queueError);
        }
      }
    }, 100); // Pequeno delay para não bloquear a UI
  };

  return (
    <div className="min-h-screen bg-background py-4 px-3 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-3">
          <h1 className="text-2xl font-bold">
            Meus <span className="bg-gradient-gold bg-clip-text text-transparent">Agendamentos</span>
          </h1>
        </div>

        <div className="mb-4">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background/60 via-background/40 to-background/20 backdrop-blur supports-[backdrop-filter]:bg-background/30 shadow-elegant">
            <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(250px_150px_at_10%_10%,black,transparent)] bg-[radial-gradient(ellipse_at_top_left,rgba(255,215,0,0.25),transparent_35%),radial-gradient(ellipse_at_bottom_right,rgba(255,215,0,0.12),transparent_35%)]"></div>
            <div className="relative p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary/30">
                <AvatarImage src={profilePhotoUrl || getUserMetadata(user).avatar_url || ''} alt={displayName || 'Usuário'} onError={(e) => { (e.currentTarget as HTMLImageElement).src = ''; }} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">{(displayName || user?.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg sm:text-xl truncate" translate="no">{displayName || 'Usuário'}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full border border-primary/30 text-primary bg-primary/10">Próx./Ativos: {upcomingCount}</span>
                  <span className="px-2 py-0.5 rounded-full border border-emerald-400/30 text-emerald-400 bg-emerald-400/10">Concluídos: {completedCount}</span>
                </div>
              </div>
              {/* Mobile logout inside hero card */}
              <div className="flex sm:hidden items-center gap-2 ml-auto">
                <Button
                  onClick={signOut}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  onClick={() => {
                    if (blocked) return;
                    navigate('/');
                    setTimeout(() => {
                      const bookingSection = document.getElementById('agendamento');
                      if (bookingSection) {
                        const yOffset = -80;
                        const y = bookingSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }, 300);
                  }}
                  disabled={blocked}
                  variant={blocked ? 'outline' : 'default'}
                >
                  {blocked ? 'Usuário bloqueado' : 'Novo Agendamento'}
                </Button>
                <Button variant="outline" onClick={() => navigate('/shop')}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> Shop
                </Button>
                <Button onClick={() => navigate('/configuracoes')} variant="ghost" className="h-9 w-9 p-0" aria-label="Configurações" title="Configurações">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button onClick={signOut} variant="ghost" className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Sair" title="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="agendamentos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="fila">Fila</TabsTrigger>
          </TabsList>
          
          <div className="mb-6">
            {blocked ? (
              <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm">
                Usuário bloqueado. Entre em contato com a barbearia para desbloqueio.
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => {
                  if (blocked) return;
                  navigate('/');
                  setTimeout(() => {
                    const bookingSection = document.getElementById('agendamento');
                    if (bookingSection) {
                      const yOffset = -80;
                      const y = bookingSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }, 300);
                }}
                disabled={blocked}
                variant={blocked ? 'outline' : 'default'}
                size="sm"
              >
                {blocked ? 'Usuário bloqueado' : 'Novo Agendamento'}
              </Button>

              <Button variant="outline" size="sm" onClick={() => navigate('/shop')}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop
              </Button>

            </div>
          </div>

          <TabsContent value="agendamentos" className="space-y-5">
            <div className="grid gap-4 mb-6">
              <Card className="bg-card border-border overflow-hidden relative">
                <CardHeader className="py-2">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    Próximo Agendamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  {!appointmentsLoaded ? (
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-secondary/60 rounded animate-pulse" />
                      <div className="h-5 w-3/4 bg-secondary/60 rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-secondary/60 rounded animate-pulse" />
                    </div>
                  ) : (() => {
                    const now = new Date();
                    const activeAppointments: ActiveAppointmentItem[] = appointments
                      .map((appointment) => ({
                        ...appointment,
                        _derivedStatus: getDerivedAppointmentStatus(appointment),
                        _dateTime: getAppointmentDateTime(appointment),
                      }))
                      .filter((appointment) => appointment._derivedStatus === 'pending' || appointment._derivedStatus === 'confirmed')
                      .sort((a, b) => a._dateTime.getTime() - b._dateTime.getTime());

                    const upcoming =
                      activeAppointments.find((appointment) => appointment._dateTime >= now) ||
                      activeAppointments[0];

                    return upcoming ? (
                    <div className="space-y-1.5">
                      <p className="font-bold text-base">
                        {upcoming.service.title}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {format(new Date(upcoming.appointment_date + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })} às {upcoming.appointment_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Com {upcoming.barber.name}
                      </p>
                      {upcoming._dateTime < now && (
                        <p className="text-xs text-yellow-500 font-medium">
                          Este agendamento passou do horário e continua ativo até ser concluído ou cancelado.
                        </p>
                      )}
                      {(upcoming.status === 'pending' || upcoming.status === 'confirmed') && (
                        <div className="pt-3 border-t border-border/50 flex justify-end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                              >
                                Cancelar Agendamento
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você deseja cancelar este agendamento? Será solicitado o motivo em seguida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelClick(upcoming.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sim, cancelar
                                </AlertDialogAction>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum agendamento futuro</p>
                  );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Services Section */}
            {services.length > 0 && (
              <div className="mb-8">
                {/* Serviços mais usados (3 cards) */}
                {(() => {
                  // Seleciona top 3 por uso do cliente; se vazio, sugere pelo order_index (já aplicado no loadServices)
                  const sortedStats = [...serviceStats].sort((a, b) => b.count - a.count);
                  const countByTitle = new Map(sortedStats.map((s) => [s.title, s.count]));
                  const topByClient = sortedStats
                    .map((stat) => services.find((s) => s.title === stat.title) || null)
                    .filter((s): s is ServiceRecord => Boolean(s));
                  let topUsed: ServiceRecord[] = topByClient.slice(0, 3);
                  if (topUsed.length < 3) {
                    const extras = services.filter((s) => !topUsed.some((t) => t.id === s.id)).slice(0, 3 - topUsed.length);
                    topUsed = [...topUsed, ...extras];
                  }
                  if (topUsed.length === 0) return null;
                  return (
                    <div className="mb-6">
                      <h2 className="text-xl md:text-2xl font-bold mb-4">Serviços mais usados</h2>
                      <div className="grid grid-cols-3 gap-2 md:gap-6">
                        {topUsed.slice(0, 3).map((service) => {
                          const Icon = iconMap[service.icon] || Scissors;
                          const imageUrl = service.image_url || defaultImages[service.title] || haircutImg;
                          const usage = countByTitle.get(service.title);
                          return (
                            <Card
                              key={`top-${service.id}`}
                              className="group overflow-hidden border-border hover:border-primary transition-all duration-300 hover:shadow-gold cursor-pointer"
                              onClick={() => {
                                if (blocked) return;
                                navigate('/', { state: { preSelectedService: service, scrollToBooking: true } });
                              }}
                            >
                              <div className="relative h-24 md:h-48 overflow-hidden">
                                <img
                                  src={imageUrl}
                                  alt={service.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                {typeof usage === 'number' && usage > 0 && (
                                  <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 z-10">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary/30 text-primary bg-primary/10">
                                      {usage}x
                                    </span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
                                <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
                                  <Icon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                                </div>
                              </div>
                              <CardContent className="p-2 md:p-4">
                                <h3 className="text-base md:text-xl font-bold mb-1 group-hover:text-primary transition-colors flex items-center gap-2 whitespace-normal break-words leading-tight">
                                  <Icon className="w-5 h-5" />
                                  {service.title}
                                </h3>
                                <p className="text-muted-foreground text-xs md:text-sm mb-2">
                                  {service.description}
                                </p>
                                <p className="text-sm md:text-2xl font-bold text-primary">
                                  R$ {service.price.toFixed(2)}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
                <h2 className="text-xl md:text-2xl font-bold mb-4">
                  Nossos <span className="bg-gradient-gold bg-clip-text text-transparent">Serviços</span>
                </h2>

                <div className="max-w-md mb-4">
                  <Input
                    placeholder="Pesquisar serviço por nome..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="bg-secondary border-border focus-visible:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-6">
                  {services
                    .filter((service) =>
                      service.title.toLowerCase().includes(serviceSearch.toLowerCase())
                    )
                    .map((service) => {
                    const Icon = iconMap[service.icon] || Scissors;
                    const imageUrl = service.image_url || defaultImages[service.title] || haircutImg;
                    
                    return (
                      <Card 
                        key={service.id} 
                        className="group overflow-hidden border-border hover:border-primary transition-all duration-300 hover:shadow-gold cursor-pointer"
                        onClick={() => {
                          if (blocked) return;
                          navigate('/', { state: { preSelectedService: service, scrollToBooking: true } });
                        }}
                      >
                        <div className="relative h-24 md:h-48 overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={service.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
                          <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3">
                            <Icon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                          </div>
                        </div>
                        <CardContent className="p-2 md:p-4">
                          <h3 className="text-base md:text-xl font-bold mb-1 group-hover:text-primary transition-colors flex items-center gap-2 whitespace-normal break-words leading-tight">
                            <Icon className="w-5 h-5" />
                            {service.title}
                          </h3>
                          <p className="text-muted-foreground text-xs md:text-sm mb-2">
                            {service.description}
                          </p>
                          <p className="text-sm md:text-2xl font-bold text-primary">
                            R$ {service.price.toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {services.filter((service) =>
                    service.title.toLowerCase().includes(serviceSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="col-span-3 text-center text-sm text-muted-foreground">
                      Nenhum serviço encontrado com esse nome.
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-6">
            <Tabs value={historyTab} onValueChange={(value) => setHistoryTab(value as 'services' | 'products')} className="w-full">
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
                    <div className="mb-6 pb-4 border-b border-border">
                        <div className="grid grid-cols-2 gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Período: {
                                historyFilterPeriod === 'all' ? 'Todos' :
                                historyFilterPeriod === 'today' ? 'Hoje' :
                                historyFilterPeriod === 'week' ? 'Última Semana' :
                                historyFilterPeriod === 'month' ? 'Último Mês' : 'Último Ano'
                              }
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel className="text-xs">Período</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={historyFilterPeriod} onValueChange={(value) => {
                              if (isHistoryFilterPeriod(value)) {
                                setHistoryFilterPeriod(value);
                              }
                            }}>
                              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="today">Hoje</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="week">Última Semana</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="month">Último Mês</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="year">Último Ano</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                              <Filter className="h-3 w-3 mr-1" />
                              Status: {
                                historyFilterStatus === 'all' ? 'Todos' :
                                historyFilterStatus === 'completed' ? 'Concluído' :
                                historyFilterStatus === 'confirmed' ? 'Confirmado' :
                                historyFilterStatus === 'cancelled' ? 'Cancelado' : 'Pendente'
                              }
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={historyFilterStatus} onValueChange={(value) => {
                              if (isHistoryFilterStatus(value)) {
                                setHistoryFilterStatus(value);
                              }
                            }}>
                              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="completed">Concluído</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="confirmed">Confirmado</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="cancelled">Cancelado</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="pending">Pendente</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                              <Scissors className="h-3 w-3 mr-1" />
                              Serviço: {services.find(s => s.id === historyFilterService)?.title || 'Todos'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel className="text-xs">Serviço</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={historyFilterService} onValueChange={setHistoryFilterService}>
                              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                              {services.map((service) => (
                                <DropdownMenuRadioItem key={service.id} value={service.id}>{service.title}</DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {loadingHistoryAppointments ? (
                        <div className="flex items-center justify-center py-8">
                          <Clock className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : historyAppointments.length > 0 ? (
                        historyAppointments.map((appointment) => {
                            const derivedStatus = getDerivedAppointmentStatus(appointment);
                            return (
                          <div key={appointment.id} className="p-4 bg-secondary rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-lg">{appointment.service.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(appointment.appointment_date + 'T00:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                  <Clock className="h-3 w-3 ml-2" />
                                  {appointment.appointment_time.slice(0, 5)}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Barbeiro: {appointment.barber?.name || 'Não informado'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                  derivedStatus === 'completed' ? 'bg-green-500/20 text-green-500 border-green-500/50' :
                                  derivedStatus === 'confirmed' ? 'bg-blue-500/20 text-blue-500 border-blue-500/50' :
                                  derivedStatus === 'cancelled' ? 'bg-red-500/20 text-red-500 border-red-500/50' :
                                  'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                }`}>
                                  {derivedStatus === 'completed' ? 'Concluído' :
                                   derivedStatus === 'confirmed' ? 'Confirmado' :
                                   derivedStatus === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                </span>
                                <span className="font-bold text-primary">
                                  R$ {appointment.service.price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            
                            {(derivedStatus === 'pending' || derivedStatus === 'confirmed') && (
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
                          )})
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>Nenhum serviço encontrado no histórico</p>
                        </div>
                      )}
                    </div>
                    {historyAppointments.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-border/60">
                        <span className="text-xs text-muted-foreground">
                          Mostrando {historyStartIndex}-{historyEndIndex} de {historyAppointmentsTotalCount}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={currentHistoryPage <= 1}
                            onClick={() => setHistoryAppointmentsPage((prev) => Math.max(1, prev - 1))}
                          >
                            Anterior
                          </Button>
                          <span className="text-xs text-muted-foreground min-w-[68px] text-center">
                            {currentHistoryPage} / {historyTotalPages}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={currentHistoryPage >= historyTotalPages}
                            onClick={() => setHistoryAppointmentsPage((prev) => Math.min(historyTotalPages, prev + 1))}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
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
                                    src={
                                      getOptimizedStorageImageUrl(sale.product.image_url, {
                                        width: 128,
                                        height: 128,
                                        quality: 60,
                                        resize: 'cover',
                                      }) || sale.product.image_url
                                    }
                                    alt={sale.product.name} 
                                    loading="lazy"
                                    decoding="async"
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
                    {productSales.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-border/60">
                        <span className="text-xs text-muted-foreground">
                          Mostrando {productHistoryStartIndex}-{productHistoryEndIndex} de {productHistoryTotalCount}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={currentProductHistoryPage <= 1}
                            onClick={() => setProductHistoryPage((prev) => Math.max(1, prev - 1))}
                          >
                            Anterior
                          </Button>
                          <span className="text-xs text-muted-foreground min-w-[68px] text-center">
                            {currentProductHistoryPage} / {productHistoryTotalPages}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={currentProductHistoryPage >= productHistoryTotalPages}
                            onClick={() => setProductHistoryPage((prev) => Math.min(productHistoryTotalPages, prev + 1))}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
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
