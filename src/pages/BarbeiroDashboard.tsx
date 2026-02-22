import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Calendar, Clock, User, Plus, Upload, X, Camera, Loader2, LogOut, ShoppingBag, Settings, Smartphone, Banknote, CreditCard, Users, Scissors, Filter } from 'lucide-react';
import { format, addMinutes as addMinutesDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem 
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/hooks/useNotifications';
import { sendWhatsAppMessage } from '@/services/whatsappService';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BarberFinancialDashboard from '@/components/BarberFinancialDashboard';
import { BarberBreakManager } from '@/components/admin/BarberBreakManager';
import { ProductSalesManager } from '@/components/ProductSalesManager';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useBarberProductCommissions } from '@/hooks/useBarberProductCommissions';
import { useBarberFixedCommissions } from '@/hooks/useBarberFixedCommissions';
import { listAdvancesByBarber, approveAdvance, rejectAdvance } from '@/integrations/supabase/barberAdvances';
import { generateUUID } from '@/utils/uuid';
import { useOperatingHours, getDayKey } from '@/hooks/useOperatingHours';

const BarbeiroDashboard = () => {
  const navigate = useNavigate();
  const { role: userRole, user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState<string>('');
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
    isRetroactive: false, // Flag para agendamentos passados criados manualmente
  });
  const [newAppointmentStep, setNewAppointmentStep] = useState<'service' | 'datetime' | 'client'>('service');
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [payments, setPayments] = useState<{method: string, amount: number}[]>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<string>('');
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<string>('pix');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [advances, setAdvances] = useState<any[]>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAppointmentForAction, setSelectedAppointmentForAction] = useState<any | null>(null);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappAppointment, setWhatsappAppointment] = useState<any | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  
  // Estados para edição de agendamento
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState<any | null>(null);
  const [editAppointment, setEditAppointment] = useState({
    date: '',
    time: '',
  });
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'all' | 'completed' | 'cancelled' | 'confirmed'>('all');
  const [historyFilterService, setHistoryFilterService] = useState<string>('all');
  const [historyFilterPayment, setHistoryFilterPayment] = useState<'all' | 'pix' | 'dinheiro'>('all');
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'vendas' | 'horarios' | 'financeiro' | 'historico'>('agendamentos');
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [loadingProductHistory, setLoadingProductHistory] = useState(false);
  
  // Product sale dialog
  const [productSaleDialogOpen, setProductSaleDialogOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [savingProductSale, setSavingProductSale] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Estado para prevenir submissões simultâneas de agendamentos
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [hasBarberBreaks, setHasBarberBreaks] = useState(true);
  const [todayBreaks, setTodayBreaks] = useState<any[]>([]);
  const [serviceSelectOpen, setServiceSelectOpen] = useState(false);
  const { getTimeSlotsForDate, isDateOpen } = useOperatingHours();
  const [availableNewSlots, setAvailableNewSlots] = useState<string[]>([]);
  const [loadingNewSlots, setLoadingNewSlots] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  
  // Hooks for commission calculation
  const barberIdForCommissions = currentUserBarber?.id || selectedBarber;
  const { getCommissionPercentage: getIndividualProductCommissionPercentage } = useBarberProductCommissions(barberIdForCommissions);
  const { getProductCommissionPercentage: getFixedProductCommissionPercentage } = useBarberFixedCommissions(barberIdForCommissions);

  const pastPendingCount = useMemo(() => {
    const now = new Date();
    const targetBarber = selectedBarber || currentUserBarber?.id;
    if (!targetBarber) return 0;
    let count = 0;
    for (const a of appointments) {
      if (a.barber_id !== targetBarber) continue;
      if (!(a.status === 'pending' || a.status === 'confirmed')) continue;
      const timeStr = (a.appointment_time || '00:00').slice(0, 5);
      const aptDateTime = new Date(`${a.appointment_date}T${timeStr}:00`);
      if (aptDateTime < now) count++;
    }
    return count;
  }, [appointments, selectedBarber, currentUserBarber?.id]);

  const pastPendingList = useMemo(() => {
    const now = new Date();
    const targetBarber = selectedBarber || currentUserBarber?.id;
    if (!targetBarber) return [];
    return appointments
      .filter((a) => {
        if (a.barber_id !== targetBarber) return false;
        if (!(a.status === 'pending' || a.status === 'confirmed')) return false;
        const timeStr = (a.appointment_time || '00:00').slice(0, 5);
        const dt = new Date(`${a.appointment_date}T${timeStr}:00`);
        return dt < now;
      })
      .sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) {
          return b.appointment_date.localeCompare(a.appointment_date);
        }
        return b.appointment_time.localeCompare(a.appointment_time);
      });
  }, [appointments, selectedBarber, currentUserBarber?.id]);

  const loadProductHistory = async () => {
    try {
      setLoadingProductHistory(true);
      const targetBarber = selectedBarber || currentUserBarber?.id;
      if (!targetBarber) {
        setProductHistory([]);
        setLoadingProductHistory(false);
        return;
      }
      const { data } = await (supabase as any)
        .from('product_sales')
        .select(`
          id, sale_date, sale_time, quantity, total_price, status, notes,
          product:products(name)
        `)
        .eq('barber_id', targetBarber)
        .order('sale_date', { ascending: false })
        .order('sale_time', { ascending: false });
      setProductHistory(data || []);
    } catch (e) {
      console.warn('Erro ao carregar histórico de produtos do barbeiro:', e);
      setProductHistory([]);
    } finally {
      setLoadingProductHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico') {
      loadProductHistory();
    }
  }, [activeTab, selectedBarber, currentUserBarber?.id]);

  const getFilteredProductHistory = () => {
    let filtered = [...productHistory];
    if (historyFilterPeriod !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((sale) => {
        const saleDate = new Date(sale.sale_date + 'T00:00:00');
        saleDate.setHours(0, 0, 0, 0);
        switch (historyFilterPeriod) {
          case 'today':
            return saleDate.getTime() === today.getTime();
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return saleDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return saleDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return saleDate >= yearAgo;
          default:
            return true;
        }
      });
    }
    return filtered;
  };
  const sendBarberPendingWhatsApp = async (barberId: string) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          photo_url,
          payment_method,
          client_name,
          service:services(title)
        `)
        .eq('barber_id', barberId)
        .in('status', ['pending', 'confirmed'])
        .lte('appointment_date', todayStr)
        .order('appointment_date')
        .order('appointment_time');
      if (error) {
        console.error('Error loading pending appointments for WhatsApp:', error);
        return;
      }
      const ids = (data || []).map((a: any) => a.id);
      let paidIds = new Set<string>();
      if (ids.length > 0) {
        const { data: pays } = await (supabase as any)
          .from('appointment_payments')
          .select('appointment_id')
          .in('appointment_id', ids);
        paidIds = new Set((pays || []).map((p: any) => p.appointment_id));
      }
      const now = new Date();
      const pastPending = (data || []).filter((a: any) => {
        if (paidIds.has(a.id)) return false;
        if (a.photo_url || a.payment_method) return false;
        const timeStr = (a.appointment_time || '00:00').slice(0, 5);
        const dt = new Date(`${a.appointment_date}T${timeStr}:00`);
        return dt < now;
      });
      if (pastPending.length === 0) return;
      const b = (barbers.find((bb) => bb.id === barberId) || currentUserBarber);
      const phone = b?.whatsapp_phone || '';
      const barberName = b?.name || 'Barbeiro';
      if (!phone) {
        console.warn('Barber has no whatsapp_phone, skipping WhatsApp message');
        return;
      }
      let msg = `🔔 *Pendências de Atendimento*\n*${barberName}*\n\n`;
      pastPending.forEach((apt: any, idx: number) => {
        const dd = new Date(apt.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR');
        const hh = (apt.appointment_time || '').slice(0, 5);
        const client = apt.client?.name || apt.client_name || 'Cliente';
        const serv = apt.service?.title || 'Serviço';
        msg += `${idx + 1}. ${dd} ${hh} — ${serv} — ${client}\n`;
      });
      msg += `\nTotal: ${pastPending.length}`;
      await sendWhatsAppMessage(phone, msg);
    } catch (err) {
      console.error('Error sending WhatsApp pending list:', err);
    }
  };


  useEffect(() => {
    if (userRole !== null) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  useEffect(() => {
    (async () => {
      try {
        const { error } = await (supabase as any)
          .from('barber_breaks')
          .select('start_time')
          .limit(1);
        if (error) {
          setHasBarberBreaks(false);
        }
      } catch {
        setHasBarberBreaks(false);
      }
    })();
  }, []);
  
  useEffect(() => {
    if (showNewAppointment) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      setNewAppointment((prev) => ({
        ...prev,
        barberId: prev.barberId || selectedBarber || currentUserBarber?.id || '',
        date: prev.date || todayStr,
      }));
      setNewAppointmentStep('service');
    }
  }, [showNewAppointment]);
  useEffect(() => {
    const resolveName = async () => {
      if (!user) return;
      if (currentUserBarber?.name) {
        setDisplayName(currentUserBarber.name);
        return;
      }
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

    resolveName();
  }, [user, currentUserBarber]);

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
        console.log('User is a barber:', userBarber.name);
        setCurrentUserBarber(userBarber);
        setSelectedBarber(userBarber.id);
        
        // If user is a barber (not admin), only show their own data
        if (!userRole || userRole !== 'admin') {
          console.log('NOT ADMIN - Setting barbers to only:', userBarber.name);
          setBarbers([userBarber]);
        } else {
          console.log('IS ADMIN - Loading all barbers');
          const { data: barbersData, error: barbersError } = await supabase
            .from('barbers')
            .select('*')
            .eq('visible', true)
            .order('order_index');
          
          if (barbersError) {
            console.error('Error loading barbers:', barbersError);
          }
          
          if (barbersData && barbersData.length > 0) {
            console.log('Loaded ALL barbers for admin:', barbersData);
            setBarbers(barbersData);
          }
        }
        // Carregar vales do barbeiro
        loadAdvances();
      } else {
        console.log('User is not a barber');
        if (userRole === 'admin') {
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
            setSelectedBarber(barbersData[0].id);
          }
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

  const loadTodayBreaks = async () => {
    try {
      const barberId = selectedBarber || currentUserBarber?.id;
      if (!barberId) {
        setTodayBreaks([]);
        return;
      }

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const { data: breaksData, error: breaksError } = await (supabase as any)
        .from('barber_breaks')
        .select('id, date, start_time, end_time, notes')
        .eq('barber_id', barberId)
        .eq('date', todayStr)
        .order('start_time', { ascending: true });

      if (breaksError && breaksError.code !== 'PGRST116' && breaksError.code !== 'PGRST205' && breaksError.code !== '42P01') {
        console.warn('Error loading today breaks:', breaksError);
      }

      let combined: any[] = breaksData || [];

      try {
        const barber = barbers.find(b => b.id === barberId) as any;
        if (barber?.availability) {
          const availability = typeof barber.availability === 'string'
            ? JSON.parse(barber.availability)
            : barber.availability;
          const dayKey = getDayKey(new Date(todayStr + 'T00:00:00'));
          const dayAvailability = availability?.[dayKey];
          if (dayAvailability?.hasLunchBreak && dayAvailability.lunchStart && dayAvailability.lunchEnd) {
            combined = [
              ...combined,
              {
                id: `lunch-${barberId}-${todayStr}`,
                date: todayStr,
                start_time: dayAvailability.lunchStart,
                end_time: dayAvailability.lunchEnd,
                notes: 'Almoço',
                isLunch: true,
              },
            ];
          }
        }
      } catch (err) {
        console.warn('Error loading lunch break for today:', err);
      }

      combined.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
      setTodayBreaks(combined);
    } catch (err) {
      console.error('Error in loadTodayBreaks:', err);
      setTodayBreaks([]);
    }
  };

  const addMinutesToTime = (time: string, minutes: number) => {
    const [h, m] = time.split(':').map(Number);
    const base = new Date(2000, 0, 1, h, m, 0, 0);
    const out = addMinutesDate(base, minutes);
    const hh = String(out.getHours()).padStart(2, '0');
    const mm = String(out.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const loadAvailableSlotsForNewAppointment = async () => {
    try {
      const barberId = newAppointment.barberId || selectedBarber || currentUserBarber?.id || '';
      if (!barberId || !newAppointment.serviceId || !newAppointment.date) {
        setAvailableNewSlots([]);
        return;
      }
      const selectedService = services.find(s => s.id === newAppointment.serviceId);
      const serviceDuration = selectedService?.duration || 30;
      const dateObj = new Date(newAppointment.date + 'T12:00:00');
      if (!isDateOpen(dateObj)) {
        setAvailableNewSlots([]);
        return;
      }
      setLoadingNewSlots(true);
      const [{ data: appts }, { data: breaks }] = await Promise.all([
        (supabase as any)
          .from('appointments')
          .select('appointment_time, service:services(duration), status')
          .eq('barber_id', barberId)
          .eq('appointment_date', newAppointment.date)
          .neq('status', 'cancelled'),
        (supabase as any)
          .from('barber_breaks')
          .select('start_time, end_time')
          .eq('barber_id', barberId)
          .eq('date', newAppointment.date),
      ]);

      let lunchBreak: { start_time: string; end_time: string } | null = null;
      try {
        const barber = barbers.find(b => b.id === barberId) as any;
        if (barber?.availability) {
          const availability = typeof barber.availability === 'string'
            ? JSON.parse(barber.availability)
            : barber.availability;
          const dayKey = getDayKey(dateObj);
          const dayAvailability = availability?.[dayKey];
          if (dayAvailability?.hasLunchBreak && dayAvailability.lunchStart && dayAvailability.lunchEnd) {
            lunchBreak = {
              start_time: dayAvailability.lunchStart,
              end_time: dayAvailability.lunchEnd,
            };
          }
        }
      } catch (e) {
        console.warn('Falha ao validar horário de almoço do barbeiro (novo agendamento):', e);
      }
      const daySlots = getTimeSlotsForDate(dateObj);
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const isToday = newAppointment.date === todayStr;
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const overlaps = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && e1 > s2;
      const aptRanges = (appts || []).map((a: any) => {
        const dur = a.service?.duration || 30;
        return { start: a.appointment_time.slice(0,5), end: addMinutesToTime(a.appointment_time.slice(0,5), dur) };
      });
      const combinedBreaks = [
        ...(breaks || []),
        ...(lunchBreak ? [lunchBreak] : []),
      ];
      const breakRanges = combinedBreaks.map((b: any) => ({ start: b.start_time.slice(0,5), end: b.end_time.slice(0,5) }));
      const fitsInHours = (slot: string) => {
        // Ensure each 30-min block within service duration exists within operating hours
        const blocks = Math.ceil(serviceDuration / 30);
        let cursor = slot;
        for (let i = 0; i < blocks; i++) {
          if (!daySlots.includes(cursor)) return false;
          cursor = addMinutesToTime(cursor, 30);
        }
        return true;
      };
      const result = daySlots.filter((slot) => {
        if (!newAppointment.isRetroactive && isToday && slot <= currentHHMM) return false;
        if (!fitsInHours(slot)) return false;
        const slotEnd = addMinutesToTime(slot, serviceDuration);
        if (aptRanges.some(r => overlaps(slot, slotEnd, r.start, r.end))) return false;
        if (breakRanges.some(r => overlaps(slot, slotEnd, r.start, r.end))) return false;
        return true;
      });
      setAvailableNewSlots(result);
    } catch (err) {
      console.error('Error loading available slots:', err);
      setAvailableNewSlots([]);
    } finally {
      setLoadingNewSlots(false);
    }
  };

  useEffect(() => {
    if (newAppointmentStep === 'datetime') {
      loadAvailableSlotsForNewAppointment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAppointmentStep, newAppointment.serviceId, newAppointment.date, selectedBarber, currentUserBarber?.id, newAppointment.isRetroactive]);

  // Load products for sale
  const loadProductsForSale = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock')
        .eq('visible', true)
        .order('name');

      if (error) {
        console.error('Error loading products:', error);
        toast.error('Erro ao carregar produtos');
      } else {
        setAvailableProducts(data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  // Handle product sale
  const handleProductSale = async () => {
    if (!selectedProductId) {
      toast.error('Selecione um produto');
      return;
    }

    if (productQuantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    const product = availableProducts.find(p => p.id === selectedProductId);
    if (!product) {
      toast.error('Produto não encontrado');
      return;
    }

    // Verificar estoque
    if (product.stock !== null && product.stock < productQuantity) {
      toast.error(`Estoque insuficiente. Disponível: ${product.stock}`);
      return;
    }

    if (!barberIdForCommissions) {
      toast.error('Barbeiro não identificado');
      return;
    }

    setSavingProductSale(true);

    try {
      const unitPrice = product.price;
      const totalPrice = unitPrice * productQuantity;
      
      // Calcular comissão (prioridade: individual > fixa)
      const individualCommission = getIndividualProductCommissionPercentage(barberIdForCommissions, selectedProductId);
      const fixedCommission = getFixedProductCommissionPercentage(barberIdForCommissions);
      const commissionPercentage = individualCommission > 0 ? individualCommission : fixedCommission;
      const commissionValue = (totalPrice * commissionPercentage) / 100;

      const { error } = await supabase
        .from('product_sales')
        .insert({
          barber_id: barberIdForCommissions,
          product_id: selectedProductId,
          quantity: productQuantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          commission_percentage: commissionPercentage,
          commission_value: commissionValue,
          sale_date: format(new Date(), 'yyyy-MM-dd'),
          sale_time: format(new Date(), 'HH:mm'),
        });

      if (error) throw error;

      // Atualizar estoque do produto
      if (product.stock !== null) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: product.stock - productQuantity })
          .eq('id', selectedProductId);

        if (stockError) {
          console.error('Error updating stock:', stockError);
          // Não falhar a venda se o estoque não atualizar
        }
      }

      toast.success('Venda registrada com sucesso!', {
        description: `Produto: ${product.name} - Total: R$ ${totalPrice.toFixed(2)} - Comissão: R$ ${commissionValue.toFixed(2)}`,
        duration: 3000, // 3 segundos
      });
      
      setProductSaleDialogOpen(false);
      setSelectedProductId('');
      setProductQuantity(1);
      
      // Recarregar produtos para atualizar estoque
      loadProductsForSale();
      
      // Forçar atualização do dashboard financeiro (se estiver aberto)
      // O dashboard financeiro já tem realtime subscription, então será atualizado automaticamente
    } catch (error: any) {
      console.error('Error saving product sale:', error);
      toast.error(error.message || 'Erro ao registrar venda');
    } finally {
      setSavingProductSale(false);
    }
  };

  useEffect(() => {
    if (selectedBarber) {
      loadAppointments();
    }
  }, [selectedBarber]);

  useEffect(() => {
    const barberId = selectedBarber || currentUserBarber?.id;
    if (!barberId) return;

    const channelName = `barber-breaks-${barberId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barber_breaks',
          filter: `barber_id=eq.${barberId}`,
        },
        () => {
          loadTodayBreaks();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBarber, currentUserBarber?.id]);

  useEffect(() => {
    const barberId = selectedBarber || currentUserBarber?.id;
    if (!barberId) return;

    const channelName = `barber-lunch-${barberId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barbers',
          filter: `id=eq.${barberId}`,
        },
        () => {
          loadTodayBreaks();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBarber, currentUserBarber?.id]);

  const formatWhatsappNumber = (raw: string) => {
    const digits = (raw || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('55')) return digits;
    if (digits.length >= 10 && digits.length <= 12) return `55${digits}`;
    return digits;
  };

  const handleWhatsAppClick = (appointment: any) => {
    const phone = appointment?.client?.phone || '';
    if (phone) {
      const n = formatWhatsappNumber(phone);
      window.open(`https://wa.me/${n}`, '_blank', 'noopener,noreferrer');
      return;
    }
    setWhatsappAppointment(appointment);
    setWhatsappNumber(appointment?.client?.phone || '');
    setWhatsappDialogOpen(true);
  };

  const handleOpenWhatsAppWithInput = () => {
    const n = formatWhatsappNumber(whatsappNumber);
    if (!n) return;
    window.open(`https://wa.me/${n}`, '_blank', 'noopener,noreferrer');
    setWhatsappDialogOpen(false);
    setWhatsappAppointment(null);
    setWhatsappNumber('');
  };

  const handleSavePhoneAndOpenWhatsApp = async () => {
    if (!whatsappAppointment?.client?.id) {
      handleOpenWhatsAppWithInput();
      return;
    }
    const n = formatWhatsappNumber(whatsappNumber);
    if (!n) return;
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ phone: n })
      .eq('id', whatsappAppointment.client.id);
    if (!error) {
      loadAppointments();
    }
    window.open(`https://wa.me/${n}`, '_blank', 'noopener,noreferrer');
    setWhatsappDialogOpen(false);
    setWhatsappAppointment(null);
    setWhatsappNumber('');
  };
  // Sistema de notificações com Service Worker
  const { isReady, showNotification } = useNotifications();
  const pendingNotifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const now = new Date();
    const targetBarber = selectedBarber || currentUserBarber?.id;
    if (!targetBarber) return;
    const pastPending = appointments.filter((a) => {
      if (a.barber_id !== targetBarber) return false;
      if (!(a.status === 'pending' || a.status === 'confirmed')) return false;
      const timeStr = (a.appointment_time || '00:00').slice(0, 5);
      const aptDateTime = new Date(`${a.appointment_date}T${timeStr}:00`);
      return aptDateTime < now;
    });
    if (pastPending.length === 0) return;
    const unseen = pastPending.filter(a => !pendingNotifiedRef.current.has(a.id));
    if (unseen.length === 0) return;
    unseen.forEach(a => pendingNotifiedRef.current.add(a.id));
    const msg = `Você tem ${pastPending.length} atendimento(s) pendente(s) já passados.`;
    toast.info('Lembrete de pendências', { description: msg, duration: 2500 });
    if (isReady && showNotification) {
      showNotification('🔔 Pendências de atendimento', {
        body: msg,
      });
    }
  }, [appointments, selectedBarber, currentUserBarber?.id, isReady]);

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
              
              const notificationMessage = `Cliente: ${payload.new.client_name || client?.name || 'Desconhecido'}\nServiço: ${service?.title || 'Desconhecido'}\nHorário: ${appointmentTime}\nData: ${appointmentDate}`;
              
              // Toast na interface
              toast.success('📅 Novo Agendamento!', {
                description: notificationMessage,
                duration: 3000, // Reduzido de 10000 para 3000ms (3 segundos)
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
        service:services(title, price, duration),
        appointment_payments(amount, payment_method)
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
        .select('id, name, phone, whatsapp, photo_url')
        .in('id', clientIds);
      
      console.log('Loaded clients:', clientsData);
      
      // Mapear clientes para appointments, garantindo telefone preenchido
      const appointmentsWithClients = appointmentsData.map(appointment => {
        const client = clientsData?.find(c => c.id === appointment.client_id) as any | undefined;
        if (!client) {
          return {
            ...appointment,
            client: null,
          };
        }
        const phone = client.phone || client.whatsapp || '';
        return {
          ...appointment,
          client: { ...client, phone },
        };
      });
      
      setAppointments(appointmentsWithClients);
    } else {
      setAppointments([]);
    }

    await loadTodayBreaks();
  };

  const loadAdvances = async () => {
    if (!currentUserBarber?.id) return;
    setLoadingAdvances(true);
    const { data, error } = await listAdvancesByBarber(currentUserBarber.id);
    setLoadingAdvances(false);

    if (error) {
      console.error("Error loading advances for barber:", error);
      return;
    }

    setAdvances(data || []);
  };

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointmentForAction(appointment);
    setActionDialogOpen(true);
  };

  // Função para abrir o modal de edição
  const handleEditClick = (appointment: any) => {
    setAppointmentToEdit(appointment);
    setEditAppointment({
      date: appointment.appointment_date,
      time: appointment.appointment_time,
    });
    setActionDialogOpen(false);
    setEditDialogOpen(true);
  };

  // Função para salvar as alterações do agendamento
  const handleSaveEdit = async () => {
    if (!appointmentToEdit || !editAppointment.date || !editAppointment.time) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Verificar se é um agendamento futuro para validar conflitos
    const appointmentDateTime = new Date(`${editAppointment.date}T${editAppointment.time}:00`);
    const now = new Date();
    const isPastAppointment = appointmentDateTime < now;

    // Se não for retroativo, verificar conflitos de horário
    if (!isPastAppointment) {
      const selectedService = services.find(s => s.id === appointmentToEdit.service_id);
      const serviceDuration = selectedService?.duration || 30;

      const { data: existingAppointments } = await (supabase as any)
        .from('appointments')
        .select('id, appointment_time, service:services(duration)')
        .eq('barber_id', appointmentToEdit.barber_id)
        .eq('appointment_date', editAppointment.date)
        .neq('status', 'cancelled')
        .neq('id', appointmentToEdit.id); // Excluir o próprio agendamento

      // Check for time conflicts
      const hasConflict = existingAppointments?.some((apt: any) => {
        const aptDuration = apt.service?.duration || 30;
        const newEndTime = addMinutesToTime(editAppointment.time, serviceDuration);
        const aptEndTime = addMinutesToTime(apt.appointment_time, aptDuration);
        return (editAppointment.time < aptEndTime && newEndTime > apt.appointment_time);
      });

      if (hasConflict) {
        toast.error('Horário indisponível! Já existe um agendamento neste horário.');
        return;
      }
    }

    try {
      const { error } = await (supabase as any)
        .from('appointments')
        .update({
          appointment_date: editAppointment.date,
          appointment_time: editAppointment.time,
          notes: appointmentToEdit.notes 
            ? `${appointmentToEdit.notes} [Editado pelo barbeiro]`
            : '[Editado pelo barbeiro]'
        })
        .eq('id', appointmentToEdit.id);

      if (error) {
        console.error('Error updating appointment:', error);
        toast.error('Erro ao atualizar agendamento: ' + error.message);
      } else {
        toast.success('Agendamento atualizado com sucesso!', {
          duration: 2000, // 2 segundos
        });
        setEditDialogOpen(false);
        setAppointmentToEdit(null);
        setEditAppointment({ date: '', time: '' });
        loadAppointments();
      }
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento: ' + error.message);
    }
  };

  // Sempre que o barbeiro logado for carregado/alterado, recarregar os vales
  useEffect(() => {
    if (currentUserBarber?.id) {
      loadAdvances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserBarber?.id]);

  const handleCreateAppointment = async () => {
    // Prevenir múltiplas submissões simultâneas
    if (creatingAppointment) {
      toast.warning('Aguarde, processando agendamento...');
      return;
    }

    // Usar barberId do formulário ou o selectedBarber como fallback
    const barberId = newAppointment.barberId || selectedBarber;
    
    // Validações básicas
    if (!newAppointment.serviceId) {
      toast.error('Selecione um serviço');
      return;
    }
    
    if (!barberId) {
      toast.error('Selecione um barbeiro');
      return;
    }
    
    if (!newAppointment.date) {
      toast.error('Selecione uma data');
      return;
    }
    
    if (!newAppointment.time) {
      toast.error('Selecione um horário');
      return;
    }

    // Verificar se o serviço existe
    const selectedService = services.find(s => s.id === newAppointment.serviceId);
    if (!selectedService) {
      toast.error('Serviço selecionado não encontrado');
      return;
    }

    // Ativar estado de loading
    setCreatingAppointment(true);

    try {
      // Verificar se é um agendamento retroativo (passado)
      const appointmentDateTime = new Date(`${newAppointment.date}T${newAppointment.time}:00`);
      const now = new Date();
      const isPastAppointment = appointmentDateTime < now;

      // 1. VALIDAÇÕES EM PARALELO (otimizado como no cliente)
      const [existingAppointmentResult, breaksResult] = await Promise.allSettled([
        // Verificar conflitos de horário (apenas se não for retroativo)
        (!isPastAppointment && !newAppointment.isRetroactive) ? 
          (supabase as any)
            .from('appointments')
            .select('appointment_time, service:services(duration)')
            .eq('barber_id', barberId)
            .eq('appointment_date', newAppointment.date)
            .neq('status', 'cancelled') :
          Promise.resolve({ data: [] }),
        
        // Verificar pausas do barbeiro (apenas se não for retroativo)
        (!isPastAppointment && !newAppointment.isRetroactive && hasBarberBreaks) ?
          (supabase as any)
            .from('barber_breaks')
            .select('*')
            .eq('barber_id', barberId)
            .eq('date', newAppointment.date) :
          Promise.resolve({ data: [] })
      ]);

      // Verificar conflitos apenas se não for retroativo
      if (!isPastAppointment && !newAppointment.isRetroactive) {
        if (existingAppointmentResult.status === 'fulfilled' && existingAppointmentResult.value.data) {
          const serviceDuration = selectedService.duration || 30;

          const hasConflict = existingAppointmentResult.value.data.some((apt: any) => {
            const aptDuration = apt.service?.duration || 30;
            const newEndTime = addMinutesToTime(newAppointment.time, serviceDuration);
            const aptEndTime = addMinutesToTime(apt.appointment_time, aptDuration);
            return (newAppointment.time < aptEndTime && newEndTime > apt.appointment_time);
          });

          if (hasConflict) {
            toast.error('Horário indisponível! Já existe um agendamento neste horário.');
            return;
          }
        }

        // Verificar pausas
        let dbBreaks: any[] = [];
        if (breaksResult.status === 'fulfilled' && breaksResult.value.data) {
          dbBreaks = breaksResult.value.data;
        }

        let lunchBreak: { start_time: string; end_time: string } | null = null;
        try {
          const barber = barbers.find(b => b.id === barberId) as any;
          if (barber?.availability) {
            const availability = typeof barber.availability === 'string'
              ? JSON.parse(barber.availability)
              : barber.availability;
            const selectedDate = new Date(newAppointment.date + 'T00:00:00');
            const dayKey = getDayKey(selectedDate);
            const dayAvailability = availability?.[dayKey];
            if (dayAvailability?.hasLunchBreak && dayAvailability.lunchStart && dayAvailability.lunchEnd) {
              lunchBreak = {
                start_time: dayAvailability.lunchStart,
                end_time: dayAvailability.lunchEnd,
              };
            }
          }
        } catch (err) {
          console.warn('Erro ao ler horário de almoço do barbeiro:', err);
        }

        const combinedBreaks = [
          ...dbBreaks,
          ...(lunchBreak ? [lunchBreak] : []),
        ];

        if (combinedBreaks.length > 0) {
          const serviceDuration = selectedService.duration || 30;
          
          const timeToMinutes = (time: string) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
          };

          const slotStartMinutes = timeToMinutes(newAppointment.time);
          const slotEndMinutes = slotStartMinutes + serviceDuration;

          const isInBreak = combinedBreaks.some((breakItem: any) => {
            const breakStartMinutes = timeToMinutes(breakItem.start_time);
            const breakEndMinutes = timeToMinutes(breakItem.end_time);
            return slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes;
          });

          if (isInBreak) {
            toast.error("Horário indisponível", {
              description: "Este horário está em uma pausa do barbeiro.",
            });
            return;
          }
        }
      }

      // 2. CRIAR PERFIL TEMPORÁRIO (nome opcional; se vazio, usar 'Local')
      const profileId = generateUUID();
      const clientNameFinal = (newAppointment.clientName?.trim() || 'Local');
      const { data: newProfile, error: profileError } = await (supabase as any)
        .from('profiles')
        .insert([{
          id: profileId,
          name: clientNameFinal,
          is_temp_user: true,
        }])
        .select('id')
        .single();
      if (profileError || !newProfile?.id) {
        console.error('Error creating profile:', profileError);
        toast.error('Erro ao criar perfil do cliente: ' + (profileError?.message || 'Erro desconhecido'));
        return;
      }
      const finalProfileId = newProfile.id;

      // 3. CRIAR AGENDAMENTO IMEDIATAMENTE
      const bookingType = 'manual';
      const { data: appointmentData, error } = await (supabase as any)
        .from('appointments')
        .insert([{
          client_id: finalProfileId,
          barber_id: barberId,
          service_id: newAppointment.serviceId,
          appointment_date: newAppointment.date,
          appointment_time: newAppointment.time,
          status: 'confirmed',
          booking_type: bookingType,
          notes: (isPastAppointment || newAppointment.isRetroactive) 
            ? 'Agendamento criado manualmente pelo barbeiro (retroativo)' 
            : 'Agendamento criado manualmente pelo barbeiro',
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        
        if (error.code === '23503' && error.message?.includes('appointments_client_id_fkey')) {
          toast.error('❌ Erro de configuração do banco!', {
            description: 'Execute o SQL de verificação no Supabase Dashboard.',
            duration: 8000,
          });
        } else if (error.code === '23503') {
          toast.error('❌ Erro de constraint no banco!', {
            description: 'Verifique se todas as migrations foram aplicadas: ' + error.message,
            duration: 6000,
          });
        } else {
          toast.error('Erro ao criar agendamento: ' + (error.message || 'Erro desconhecido'));
        }
        return;
      }

      // 4. SUCESSO IMEDIATO (como no cliente)
      const message = (isPastAppointment || newAppointment.isRetroactive)
        ? 'Agendamento retroativo criado com sucesso!'
        : 'Agendamento criado com sucesso!';
      
      toast.success(message, {
        duration: 2000,
      });

      // 5. LIMPAR FORMULÁRIO E RECARREGAR
      setShowNewAppointment(false);
      setNewAppointment({
        clientName: '',
        clientPhone: '',
        serviceId: '',
        barberId: selectedBarber || '',
        date: '',
        time: '',
        isRetroactive: false,
      });
      setNewAppointmentStep('service');
      loadAppointments();

      // 6. PROCESSAR NOTIFICAÇÕES EM BACKGROUND (não bloquear UI)
      processNotificationsAsync(appointmentData.id, newAppointment, barberId).catch(console.error);

    } catch (error: any) {
      console.error('Unexpected error in handleCreateAppointment:', error);
      toast.error('Erro inesperado: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setCreatingAppointment(false);
    }
  };

  // Função assíncrona para processar notificações (como no cliente)
  const processNotificationsAsync = async (appointmentId: string, appointmentData: any, barberId: string) => {
    try {
      const selectedService = services.find(s => s.id === appointmentData.serviceId);
      const duration = selectedService?.duration || 30;
      const startDateTime = new Date(`${appointmentData.date}T${appointmentData.time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      // Processar webhook e WhatsApp em paralelo com timeouts
      const [webhookResult, whatsappResult] = await Promise.allSettled([
        // Webhook externo (com timeout)
        Promise.race([
          supabase.functions.invoke('api', {
            body: {
              action: 'notify-webhook',
              appointmentId,
              clientName: appointmentData.clientName,
              phone: appointmentData.clientPhone || '00000000000',
              service: selectedService?.title || 'Serviço',
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              userId: barberId,
              notes: null,
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Webhook timeout')), 8000)
          )
        ]),

        // WhatsApp queue (com timeout)
        Promise.race([
          (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
            
            if (!supabaseUrl) return;

            const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-process-queue`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey || '',
                'Authorization': session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({}),
            });

            if (response.ok) {
              console.log('✅ WhatsApp queue processed');
            }
          })(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('WhatsApp timeout')), 6000)
          )
        ])
      ]);

      // Log dos resultados (não bloquear se falhar)
      if (webhookResult.status === 'fulfilled') {
        console.log('✅ Webhook notification sent');
      } else {
        console.warn('⚠️ Webhook failed:', webhookResult.reason);
      }

      if (whatsappResult.status === 'fulfilled') {
        console.log('✅ WhatsApp notification processed');
      } else {
        console.warn('⚠️ WhatsApp failed:', whatsappResult.reason);
      }

    } catch (error) {
      console.error('Error in processNotificationsAsync:', error);
    }
  };

 

  const handleUpdateStatus = async (id: string, status: string) => {
    // Se for para concluir, abre o dialog para adicionar foto
    if (status === 'completed') {
      setAppointmentToComplete(id);
      setCompleteDialogOpen(true);
      return;
    }

    // Para outros status, atualiza normalmente
    const { error } = await (supabase as any)
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado', {
        duration: 2000, // 2 segundos
      });
      loadAppointments();
    }
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
        notes: `[Cancelado pelo barbeiro] ${cancellationReason.trim()}`
      })
      .eq('id', appointmentToCancel);

    if (error) {
      toast.error('Erro ao cancelar agendamento');
      return;
    }

    // Mostrar sucesso imediatamente
    toast.success('Agendamento cancelado com sucesso', {
      duration: 2000,
    });
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

  const handleAddPayment = () => {
    if (!currentPaymentAmount || isNaN(parseFloat(currentPaymentAmount)) || parseFloat(currentPaymentAmount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    const amount = parseFloat(currentPaymentAmount);
    setPayments([...payments, { method: currentPaymentMethod, amount }]);
    setCurrentPaymentAmount('');
    // Manter o método atual para facilitar entradas consecutivas do mesmo tipo ou resetar se preferir
  };

  const handleRemovePayment = (index: number) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
  };

  const getTotalPaid = () => {
    return payments.reduce((acc, curr) => acc + curr.amount, 0);
  };

  const buildFinalPaymentsForAppointment = (appointmentId: string | null) => {
    if (!appointmentId) return null;
    let finalPayments = [...payments];
    const appointment = appointments.find(a => a.id === appointmentId);
    const servicePrice = appointment?.service?.price || 0;

    if (finalPayments.length === 0) {
      const fromInput = parseFloat(currentPaymentAmount || '');
      if (!isNaN(fromInput) && fromInput > 0) {
        finalPayments.push({ method: currentPaymentMethod, amount: fromInput });
      } else if (servicePrice > 0) {
        finalPayments.push({ method: currentPaymentMethod, amount: servicePrice });
      } else {
        toast.error('Adicione os pagamentos recebidos');
        return null;
      }
    }

    if (servicePrice > 0) {
      const totalPaid = finalPayments.reduce((acc, curr) => acc + curr.amount, 0);
      const diff = Math.abs(totalPaid - servicePrice);
      if (diff > 0.05) {
        toast.error(`Valor incorreto! O total pago (R$ ${totalPaid.toFixed(2)}) deve ser igual ao valor do serviço (R$ ${servicePrice.toFixed(2)})`);
        return null;
      }
    }

    return finalPayments;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = image.width;
      let height = image.height;
      const maxSize = 1600;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      width = width * scale;
      height = height * scale;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, width, height);

      let text = '';
      if (appointmentToComplete) {
        const apt = appointments.find(a => a.id === appointmentToComplete);
        if (apt?.appointment_date && apt?.appointment_time) {
          const timeStr = (apt.appointment_time || '').slice(0, 5);
          const dt = new Date(`${apt.appointment_date}T${timeStr || '00:00'}:00`);
          text = dt.toLocaleString('pt-BR');
        }
      }
      if (!text) {
        text = new Date().toLocaleString('pt-BR');
      }

      const padding = 12;
      const margin = 16;
      const fontSize = Math.max(Math.round(width * 0.025), 18);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = 'bottom';
      const textWidth = ctx.measureText(text).width;
      const rectHeight = fontSize + padding;
      const rectWidth = textWidth + padding * 2;
      const rectX = margin - 8;
      const rectY = height - rectHeight - margin / 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, rectX + padding, height - margin);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const finalFile = new File([blob], 'captured.jpg', { type: 'image/jpeg' });
        setPhotoFile(finalFile);
        const preview = URL.createObjectURL(blob);
        setPhotoPreview(preview);
      }, 'image/jpeg', 0.9);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error('Não foi possível ler a foto');
    };
    image.src = objectUrl;
  };

  const handleCompleteWithPhoto = async () => {
    if (!appointmentToComplete) return;

    if (!photoFile) {
      toast.error('Tire uma foto do cliente para concluir o atendimento');
      return;
    }

    const finalPayments = buildFinalPaymentsForAppointment(appointmentToComplete);
    if (!finalPayments) return;

    setUploadingPhoto(true);
    let photoUrl: string | null = null;

    try {
      try {
        const { uploadPublicImage } = await import('@/utils/storage');
        const url = await uploadPublicImage(photoFile, {
          bucket: 'appointment-photos',
          category: 'appointment-photos',
          prefix: appointmentToComplete || undefined,
        });
        photoUrl = url;
      } catch (e) {
        console.error('Erro ao fazer upload da foto:', e);
        toast.error('Erro ao fazer upload da foto. Tente novamente.');
        throw e;
      }

      // 1. Atualizar status do agendamento
      // Para o campo payment_method no appointments, se houver múltiplos, usar 'misto' ou o primeiro.
      // Vamos usar o de maior valor ou 'misto' se houver > 1.
      let mainMethod = finalPayments[0].method;
      if (finalPayments.length > 1) {
          // Check if all are same
          const allSame = finalPayments.every(p => p.method === finalPayments[0].method);
          mainMethod = allSame ? finalPayments[0].method : 'misto'; // 'misto' não é um enum válido provavelmente? Checar check constraint.
          // O check é IN ('pix', 'dinheiro', 'cartao'). Então não posso usar 'misto'.
          // Vou usar o de maior valor.
          const maxPayment = finalPayments.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
          mainMethod = maxPayment.method;
      }

      const { error: updateError } = await (supabase as any)
        .from('appointments')
        .update({ 
          status: 'completed',
          photo_url: photoUrl,
          payment_method: mainMethod
        })
        .eq('id', appointmentToComplete);

      if (updateError) throw updateError;

      const { error: deletePaymentsError } = await supabase
        .from('appointment_payments')
        .delete()
        .eq('appointment_id', appointmentToComplete);

      if (deletePaymentsError) {
        console.error('Error deleting existing payments:', deletePaymentsError);
      }

      const paymentInserts = finalPayments.map(p => ({
          appointment_id: appointmentToComplete,
          payment_method: p.method,
          amount: p.amount
      }));

      const { error: paymentsError } = await supabase
          .from('appointment_payments')
          .insert(paymentInserts);

      if (paymentsError) {
          console.error('Error inserting payments:', paymentsError);
          toast.error('Erro ao salvar detalhes do pagamento, mas o agendamento foi concluído.');
      }

      toast.success(photoUrl ? 'Agendamento concluído com foto!' : 'Agendamento concluído!', {
        duration: 2000,
      });
      
      setCompleteDialogOpen(false);
      setAppointmentToComplete(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setCurrentPaymentMethod('pix');
      setPayments([]);
      setCurrentPaymentAmount('');
      loadAppointments();
      await sendBarberPendingWhatsApp(selectedAppointmentForAction?.barber_id || currentUserBarber?.id || selectedBarber);

    } catch (error: any) {
      console.error('Erro ao completar agendamento:', error);
      toast.error('Erro ao processar: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };


  const handleCompleteWithoutPhoto = async () => {
    // Reutilizar a lógica, apenas sem foto
    // Mas como handleCompleteWithPhoto já trata se photoFile é null, posso chamar ela mesma?
    // A única diferença é que handleCompleteWithPhoto faz o upload SE photoFile existir.
    // Então posso chamar handleCompleteWithPhoto diretamente se garantir que photoFile é null, 
    // mas aqui photoFile pode estar setado mas o usuário clicou em "Sem foto".
    // Então vou limpar o photoFile antes de chamar ou passar um flag.
    // Melhor duplicar a lógica simplificada ou adaptar a anterior.
    // Vou adaptar a anterior para aceitar um argumento ou simplesmente ignorar o file se chamar essa função.
    
    // Para simplificar e evitar duplicação de código complexo de pagamentos, 
    // vou fazer o seguinte:
    // Vou extrair a lógica de salvamento para uma função comum ou apenas setar photoFile = null e chamar a outra?
    // Não posso mudar o state e chamar a função imediatamente pq o state é assíncrono.
    
    // Vou copiar a lógica de pagamentos e update.
    
    if (!appointmentToComplete) return;

    const finalPayments = buildFinalPaymentsForAppointment(appointmentToComplete);
    if (!finalPayments) return;

    setUploadingPhoto(true);
    try {
      let mainMethod = finalPayments[0].method;
      if (finalPayments.length > 1) {
          const maxPayment = finalPayments.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
          mainMethod = maxPayment.method;
      }

      const { error } = await (supabase as any)
        .from('appointments')
        .update({ 
          status: 'completed',
          payment_method: mainMethod
        })
        .eq('id', appointmentToComplete);

      if (error) throw error;

      const { error: deletePaymentsError } = await supabase
        .from('appointment_payments')
        .delete()
        .eq('appointment_id', appointmentToComplete);

      if (deletePaymentsError) {
        console.error('Error deleting existing payments:', deletePaymentsError);
      }

      const paymentInserts = finalPayments.map(p => ({
          appointment_id: appointmentToComplete,
          payment_method: p.method,
          amount: p.amount
      }));

      const { error: paymentsError } = await supabase
          .from('appointment_payments')
          .insert(paymentInserts);

      if (paymentsError) {
          console.error('Error inserting payments:', paymentsError);
      }

      toast.success('Agendamento concluído!', {
        duration: 2000,
      });
      setCompleteDialogOpen(false);
      setAppointmentToComplete(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      setCurrentPaymentMethod('pix');
      setPayments([]);
      setCurrentPaymentAmount('');
      loadAppointments();
      await sendBarberPendingWhatsApp(selectedAppointmentForAction?.barber_id || currentUserBarber?.id || selectedBarber);
    } catch (error: any) {
      console.error('Erro ao completar agendamento:', error);
      toast.error('Erro ao processar: ' + error.message);
    }
  };

  const currentBarber = userRole === 'admin' ? barbers.find(b => b.id === selectedBarber) : currentUserBarber;

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

    let appointmentsWithBreaks = [...relevantAppointments];
    const currentBarberId = selectedBarber || currentUserBarber?.id;
    if (currentBarberId && todayBreaks.length > 0) {
      const breakAppointments = todayBreaks.map((brk) => {
        const startTime = String(brk.start_time || '').slice(0, 5);
        const isLunch = brk.isLunch === true || brk.notes === 'Almoço';
        const title = isLunch ? 'Almoço' : 'Pausa';
        return {
          id: `break-${brk.id}`,
          barber_id: currentBarberId,
          appointment_date: brk.date,
          appointment_time: startTime,
          client_name: title,
          status: 'break',
          service: { title },
          notes: brk.notes || title,
          isBreak: true,
          break_start_time: brk.start_time,
          break_end_time: brk.end_time,
        };
      });
      appointmentsWithBreaks = [...appointmentsWithBreaks, ...breakAppointments].sort((a, b) => {
        if (a.appointment_date !== b.appointment_date) {
          return a.appointment_date.localeCompare(b.appointment_date);
        }
        return a.appointment_time.localeCompare(b.appointment_time);
      });
    }

    const appointmentsByBarber = barbers.map(barber => {
      const barberAppointments = appointmentsWithBreaks.filter(a => a.barber_id === barber.id);
      return {
        barber,
        appointments: barberAppointments,
        todayCount: barberAppointments.filter(a => a.appointment_date === today).length,
        upcomingCount: barberAppointments.filter(a => a.appointment_date > today).length
      };
    });

    // Ordenar barbeiros: primeiro os que têm agendamentos hoje, depois por nome
    return appointmentsByBarber.sort((a, b) => {
      if (a.todayCount > 0 && b.todayCount === 0) return -1;
      if (a.todayCount === 0 && b.todayCount > 0) return 1;
      return a.barber.name.localeCompare(b.barber.name);
    });
  };

  const appointmentsByBarber = getAppointmentsByBarber();

  // Função para filtrar agendamentos do histórico
  const getFilteredHistoryAppointments = () => {
    // Começar com todos os agendamentos (não apenas concluídos, para permitir filtrar por status)
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

    // Filtro por forma de pagamento (apenas para concluídos)
    if (historyFilterPayment !== 'all') {
      filtered = filtered.filter(apt => apt.payment_method === historyFilterPayment);
    }

    // Ordenar por data descendente, depois por hora descendente
    return filtered.sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) {
        return b.appointment_date.localeCompare(a.appointment_date);
      }
      return b.appointment_time.localeCompare(a.appointment_time);
    });
  };

  const completedAppointments = appointments
    .filter(a => a.status === 'completed')
    .sort((a, b) => {
      // Sort by date descending, then by time descending
      if (a.appointment_date !== b.appointment_date) {
        return b.appointment_date.localeCompare(a.appointment_date);
      }
      return b.appointment_time.localeCompare(a.appointment_time);
    });

  // Calculate completed appointments for different periods
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const todayCompleted = completedAppointments.filter(a => a.appointment_date === today);
  const weekCompleted = completedAppointments.filter(a => new Date(a.appointment_date) >= weekAgo);
  const monthCompleted = completedAppointments.filter(a => new Date(a.appointment_date) >= monthAgo);

  return (
    <div className="min-h-screen bg-background py-6 px-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center mb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Painel do <span className="bg-gradient-gold bg-clip-text text-transparent">Barbeiro</span>
              </h1>
            </div>
            {userRole === 'admin' && (
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
            )}
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {user && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/30">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUserBarber?.image_url || ''} alt={displayName || 'Usuário'} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                    {(displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm font-medium text-foreground">
                  {displayName || 'Usuário'}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    onClick={() => navigate('/configuracoes')}
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label="Configurações"
                    title="Configurações"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                {pastPendingCount > 0 && (
                  <span
                    title="Pendências vencidas"
                    className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  >
                    <Clock className="h-3 w-3" />
                    {pastPendingCount}
                  </span>
                )}
                  <Button
                    onClick={async () => {
                      await signOut();
                      navigate('/');
                    }}
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Sair"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {(currentUserBarber || selectedBarber) && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab as any} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
                <TabsTrigger value="vendas">Vendas</TabsTrigger>
                <TabsTrigger value="horarios">Horários</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="agendamentos" className="space-y-6" forceMount>
              <div className="mb-8">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                      Resumo de Agendamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 text-center text-xs uppercase tracking-wide text-muted-foreground">
                        <div>Hoje</div>
                        <div>Semana</div>
                        <div>Mês</div>
                      </div>
                      <div className="grid grid-cols-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {todayCompleted.length}
                        </div>
                        <div className="text-3xl font-bold text-green-500">
                          {weekCompleted.length}
                        </div>
                        <div className="text-3xl font-bold text-green-500">
                          {monthCompleted.length}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            

            <div className="mb-6 flex flex-row gap-2 items-stretch">
              <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="flex-1 min-w-0 h-8 px-1 text-xs gap-1"
                    title="Novo Agendamento"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    <span className="truncate">Novo</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {newAppointmentStep === 'service' ? 'Selecionar Serviço' : newAppointmentStep === 'datetime' ? 'Data e Hora' : 'Cliente (opcional)'}
                    </DialogTitle>
                    <DialogDescription>
                      {newAppointmentStep === 'service' ? 'Escolha o serviço.' : newAppointmentStep === 'datetime' ? 'Informe data (hoje por padrão) e horário.' : 'Se não informar, será marcado como Local.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  {newAppointmentStep === 'service' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Serviço</Label>
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          value={newAppointment.serviceId}
                          onChange={(e) => setNewAppointment({ ...newAppointment, serviceId: e.target.value })}
                        >
                          <option value="" disabled>Selecione um serviço</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.title} - R$ {service.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => setNewAppointmentStep('datetime')}
                          disabled={!newAppointment.serviceId}
                        >
                          Continuar
                        </Button>
                        <Button variant="outline" onClick={() => setShowNewAppointment(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {newAppointmentStep === 'datetime' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={newAppointment.date}
                          onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Horários Disponíveis</Label>
                        {loadingNewSlots ? (
                          <div className="text-center py-6 text-muted-foreground">Carregando horários...</div>
                        ) : availableNewSlots.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">Nenhum horário disponível</div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {availableNewSlots.map((slot) => (
                              <Button
                                key={slot}
                                type="button"
                                onClick={() => setNewAppointment({ ...newAppointment, time: slot })}
                                className={newAppointment.time === slot ? "bg-primary text-primary-foreground border border-primary" : ""}
                                variant={newAppointment.time === slot ? "default" : "outline"}
                              >
                                {slot}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/30">
                        <div className="flex-1">
                          <Label htmlFor="retroactive" className="text-sm font-medium cursor-pointer">
                            Agendamento Retroativo (Passado)
                          </Label>
                        </div>
                        <Switch
                          id="retroactive"
                          checked={newAppointment.isRetroactive}
                          onCheckedChange={(checked) => setNewAppointment({ ...newAppointment, isRetroactive: checked })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => setNewAppointmentStep('client')}
                          disabled={!newAppointment.time}
                        >
                          Continuar
                        </Button>
                        <Button variant="outline" onClick={() => setNewAppointmentStep('service')}>
                          Voltar
                        </Button>
                      </div>
                    </div>
                  )}

                  {newAppointmentStep === 'client' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do Cliente (opcional)</Label>
                        <Input
                          value={newAppointment.clientName}
                          onChange={(e) => setNewAppointment({ ...newAppointment, clientName: e.target.value })}
                          placeholder="Local"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Se vazio, será registrado como Local.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleCreateAppointment} 
                          className="flex-1"
                          disabled={creatingAppointment}
                        >
                          {creatingAppointment ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            'Criar Agendamento'
                          )}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setNewAppointmentStep('datetime')}
                          disabled={creatingAppointment}
                        >
                          Voltar
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog 
                open={productSaleDialogOpen} 
                onOpenChange={(open) => {
                  setProductSaleDialogOpen(open);
                  if (open) {
                    loadProductsForSale();
                  } else {
                    setSelectedProductId('');
                    setProductQuantity(1);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 min-w-0 h-8 px-1 text-xs"
                    title="Vender Produto"
                  >
                    <span className="truncate">Vender</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Registrar Venda de Produto</DialogTitle>
                    <DialogDescription>
                      Registre a venda de um produto. A comissão será calculada automaticamente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Produto</Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map((product) => (
                            <SelectItem 
                              key={product.id} 
                              value={product.id}
                              disabled={product.stock !== null && product.stock === 0}
                            >
                              {product.name} - R$ {product.price.toFixed(2)}
                              {product.stock !== null && ` (Estoque: ${product.stock})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedProductId && (
                      <>
                        <div>
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={productQuantity}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1;
                              setProductQuantity(Math.max(1, qty));
                            }}
                          />
                          {availableProducts.find(p => p.id === selectedProductId)?.stock !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Estoque disponível: {availableProducts.find(p => p.id === selectedProductId)?.stock || 0}
                            </p>
                          )}
                        </div>

                        <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Valor Unitário:</span>
                            <span className="font-medium">
                              R$ {availableProducts.find(p => p.id === selectedProductId)?.price.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-bold text-primary">
                              R$ {((availableProducts.find(p => p.id === selectedProductId)?.price || 0) * productQuantity).toFixed(2)}
                            </span>
                          </div>
                          {barberIdForCommissions && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Comissão ({(() => {
                                  const individual = getIndividualProductCommissionPercentage(barberIdForCommissions, selectedProductId);
                                  const fixed = getFixedProductCommissionPercentage(barberIdForCommissions);
                                  return individual > 0 ? individual : fixed;
                                })()}%):</span>
                                <span className="font-bold text-green-400">
                                  R$ {((() => {
                                    const product = availableProducts.find(p => p.id === selectedProductId);
                                    if (!product) return 0;
                                    const totalPrice = product.price * productQuantity;
                                    const individual = getIndividualProductCommissionPercentage(barberIdForCommissions, selectedProductId);
                                    const fixed = getFixedProductCommissionPercentage(barberIdForCommissions);
                                    const commissionPercentage = individual > 0 ? individual : fixed;
                                    return (totalPrice * commissionPercentage) / 100;
                                  })()).toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleProductSale} 
                        className="flex-1"
                        disabled={!selectedProductId || savingProductSale}
                      >
                        {savingProductSale ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Registrar Venda
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setProductSaleDialogOpen(false);
                          setSelectedProductId('');
                          setProductQuantity(1);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-w-0 h-8 px-1 text-xs gap-1"
                    title="Pendências vencidas"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    <span className="truncate">Pendências{pastPendingCount > 0 ? ` (${pastPendingCount})` : ''}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Pendências vencidas</DialogTitle>
                    <DialogDescription>Agendamentos passados que ainda precisam ser concluídos.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {pastPendingList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma pendência vencida encontrada.</p>
                    ) : (
                      pastPendingList.map((appointment) => {
                        const clientName = appointment.client_name || appointment.client?.name || 'Local';
                        const appointmentTime = (appointment.appointment_time || '').slice(0, 5);
                        const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00');
                        const bookingTypeLabel =
                          appointment.booking_type === 'local'
                            ? 'Local'
                            : appointment.booking_type === 'manual'
                            ? 'Manual'
                            : 'Online';
                        const bookingTypeColor =
                          appointment.booking_type === 'local'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : appointment.booking_type === 'manual'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            : 'bg-green-500/20 text-green-400 border-green-500/30';
                        return (
                          <div
                            key={appointment.id}
                            className="p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md bg-red-500/5 border-red-500/30"
                            onClick={() => {
                              setPendingDialogOpen(false);
                              handleAppointmentClick(appointment);
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border border-border">
                                  <AvatarImage src={appointment.client?.photo_url || ''} alt={clientName} />
                                  <AvatarFallback className="bg-secondary text-foreground font-semibold text-xs">
                                    {(clientName || 'C').charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">{appointment.service?.title || 'Serviço'}</p>
                                  <p className="text-xs text-muted-foreground">Cliente: {clientName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                  {format(appointmentDate, 'dd/MM', { locale: ptBR })} às {appointmentTime}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${bookingTypeColor}`}>
                                  {bookingTypeLabel}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    appointment.status === 'confirmed'
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}
                                >
                                  {appointment.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/fila')}
                className="flex-1 min-w-0 h-8 px-1 text-xs"
                title="Fila da Barbearia"
              >
                <span className="truncate">Fila</span>
              </Button>
            </div>
            

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Agendamentos por Barbeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <Tabs defaultValue="hoje" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="hoje">Agendamentos de Hoje</TabsTrigger>
                    <TabsTrigger value="futuros">Agendamentos Futuros</TabsTrigger>
                  </TabsList>

                  <TabsContent value="hoje">
                    {appointmentsByBarber.length > 0 ? (
                      <div className="space-y-4">
                        {appointmentsByBarber.map(({ barber, appointments, todayCount, upcomingCount }) => {
                          const today = new Date().toISOString().split('T')[0];
                          const list = appointments.filter(a => a.appointment_date === today);
                          return (
                            <div key={barber.id} className="border border-border rounded-lg p-3 bg-secondary/30">
                              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
                                <Avatar className="h-10 w-10 border-2 border-primary/20">
                                  <AvatarImage src={barber.photo_url || ''} alt={barber.name} />
                                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-base">
                                    {barber.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-bold text-base">{barber.name}</h3>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Hoje: {todayCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Próximos: {upcomingCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      Total: {appointments.length}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {list.length > 0 ? (
                                <div className="space-y-3">
                                  {list.map((appointment) => {
                                    const isBreak = appointment.isBreak || appointment.status === 'break';
                                    const clientName = isBreak
                                      ? (appointment.service?.title || 'Pausa')
                                      : (appointment.client_name || appointment.client?.name || 'Local');
                                    const clientInitial = clientName.charAt(0).toUpperCase();
                                    const appointmentTime = appointment.appointment_time.slice(0, 5);
                                    const breakStart = (appointment.break_start_time || appointment.appointment_time || '').slice(0, 5);
                                    const breakEnd = (appointment.break_end_time || '').slice(0, 5);
                                    const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00');
                                    const bookingTypeLabel = appointment.booking_type === 'local' ? 'Local' : 
                                                           appointment.booking_type === 'manual' ? 'Manual' : 'Online';
                                    const bookingTypeColor = appointment.booking_type === 'local' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                           appointment.booking_type === 'manual' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                                           'bg-green-500/20 text-green-400 border-green-500/30';

                                    const cardClasses = isBreak
                                      ? 'p-3 rounded-lg border cursor-default bg-red-500/10 border-red-400'
                                      : 'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md bg-primary/5 border-primary/30';

                                    const statusLabel = isBreak
                                      ? 'Pausa / Almoço'
                                      : (appointment.status === 'confirmed' ? 'Confirmado' : 'Pendente');

                                    const statusClasses = isBreak
                                      ? 'px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-500'
                                      : `px-2 py-0.5 rounded text-xs font-medium ${
                                          appointment.status === 'confirmed'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                        }`;

                                    return (
                                      <div 
                                        key={appointment.id} 
                                        className={cardClasses}
                                        onClick={() => {
                                          if (!isBreak) {
                                            handleAppointmentClick(appointment);
                                          }
                                        }}
                                      >
                                        <div className="flex items-center gap-3">
                                          <Avatar className={`h-10 w-10 border ${isBreak ? 'border-red-400 bg-red-500/10' : 'border-border'}`}>
                                            <AvatarImage src={isBreak ? '' : (appointment.client?.photo_url || '')} alt={clientName} />
                                            <AvatarFallback className={isBreak ? 'bg-red-500/20 text-red-500 font-semibold' : 'bg-secondary text-foreground font-semibold'}>
                                              {clientInitial}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                              <p className={`font-semibold text-sm ${isBreak ? 'text-red-600' : ''}`}>
                                                {appointment.service?.title || 'Serviço'}
                                              </p>
                                              <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                  isBreak ? 'bg-red-500/20 text-red-600' : 'bg-primary/20 text-primary'
                                                }`}>
                                                  {isBreak
                                                    ? `HOJE ${breakStart}${breakEnd ? ` - ${breakEnd}` : ''}`
                                                    : `HOJE às ${appointmentTime}`
                                                  }
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <p className={`text-xs ${isBreak ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                {isBreak
                                                  ? `Horário de pausa: ${breakStart}${breakEnd ? ` - ${breakEnd}` : ''}`
                                                  : `Cliente: ${clientName}`
                                                }
                                              </p>
                                              <div className="flex items-center gap-2">
                                                {!isBreak && (
                                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${bookingTypeColor}`}>
                                                    {bookingTypeLabel}
                                                  </span>
                                                )}
                                                <span className={statusClasses}>
                                                  {statusLabel}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-4">
                                  Nenhum agendamento hoje para {barber.name}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento encontrado
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="futuros">
                    {appointmentsByBarber.length > 0 ? (
                      <div className="space-y-4">
                        {appointmentsByBarber.map(({ barber, appointments, todayCount, upcomingCount }) => {
                          const today = new Date().toISOString().split('T')[0];
                          const list = appointments.filter(a => a.appointment_date > today);
                          return (
                            <div key={barber.id} className="border border-border rounded-lg p-3 bg-secondary/30">
                              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
                                <Avatar className="h-10 w-10 border-2 border-primary/20">
                                  <AvatarImage src={barber.photo_url || ''} alt={barber.name} />
                                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-base">
                                    {barber.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-bold text-base">{barber.name}</h3>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Hoje: {todayCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Próximos: {upcomingCount}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      Total: {appointments.length}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {list.length > 0 ? (
                                <div className="space-y-3">
                                  {list.map((appointment) => {
                                    const isBreak = appointment.isBreak || appointment.status === 'break';
                                    const clientName = isBreak
                                      ? (appointment.service?.title || 'Pausa')
                                      : (appointment.client_name || appointment.client?.name || 'Local');
                                    const clientInitial = clientName.charAt(0).toUpperCase();
                                    const appointmentTime = appointment.appointment_time.slice(0, 5);
                                    const breakStart = (appointment.break_start_time || appointment.appointment_time || '').slice(0, 5);
                                    const breakEnd = (appointment.break_end_time || '').slice(0, 5);
                                    const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00');
                                    const bookingTypeLabel = appointment.booking_type === 'local' ? 'Local' : 
                                                           appointment.booking_type === 'manual' ? 'Manual' : 'Online';
                                    const bookingTypeColor = appointment.booking_type === 'local' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                           appointment.booking_type === 'manual' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                                           'bg-green-500/20 text-green-400 border-green-500/30';

                                    const cardClasses = isBreak
                                      ? 'p-3 rounded-lg border cursor-default bg-red-500/10 border-red-400'
                                      : 'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md bg-card border-border';

                                    const statusLabel = isBreak
                                      ? 'Pausa / Almoço'
                                      : (appointment.status === 'confirmed' ? 'Confirmado' : 'Pendente');

                                    const statusClasses = isBreak
                                      ? 'px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-500'
                                      : `px-2 py-0.5 rounded text-xs font-medium ${
                                          appointment.status === 'confirmed'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                        }`;

                                    return (
                                      <div 
                                        key={appointment.id} 
                                        className={cardClasses}
                                        onClick={() => {
                                          if (!isBreak) {
                                            handleAppointmentClick(appointment);
                                          }
                                        }}
                                      >
                                        <div className="flex items-center gap-3">
                                          <Avatar className={`h-10 w-10 border ${isBreak ? 'border-red-400 bg-red-500/10' : 'border-border'}`}>
                                            <AvatarImage src={isBreak ? '' : (appointment.client?.photo_url || '')} alt={clientName} />
                                            <AvatarFallback className={isBreak ? 'bg-red-500/20 text-red-500 font-semibold' : 'bg-secondary text-foreground font-semibold'}>
                                              {clientInitial}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                              <p className={`font-semibold text-sm ${isBreak ? 'text-red-600' : ''}`}>
                                                {appointment.service?.title || 'Serviço'}
                                              </p>
                                              <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                  isBreak ? 'bg-red-500/20 text-red-600' : 'bg-secondary text-muted-foreground'
                                                }`}>
                                                  {isBreak
                                                    ? `${format(appointmentDate, 'dd/MM', { locale: ptBR })} ${breakStart}${breakEnd ? ` - ${breakEnd}` : ''}`
                                                    : `${format(appointmentDate, 'dd/MM', { locale: ptBR })} às ${appointmentTime}`
                                                  }
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <p className={`text-xs ${isBreak ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                {isBreak
                                                  ? `Horário de pausa: ${breakStart}${breakEnd ? ` - ${breakEnd}` : ''}`
                                                  : `Cliente: ${clientName}`
                                                }
                                              </p>
                                              <div className="flex items-center gap-2">
                                                {!isBreak && (
                                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${bookingTypeColor}`}>
                                                    {bookingTypeLabel}
                                                  </span>
                                                )}
                                                <span className={statusClasses}>
                                                  {statusLabel}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-center text-muted-foreground py-4">
                                  Nenhum agendamento futuro para {barber.name}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento encontrado
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendas" className="space-y-6" forceMount>
            <ProductSalesManager barberId={currentUserBarber?.id || selectedBarber} />
          </TabsContent>

          <TabsContent value="horarios" className="space-y-6" forceMount>
            <BarberBreakManager barberId={currentUserBarber?.id || selectedBarber} />
          </TabsContent>

          {/* Duplicate Financeiro Tab Removed */}

      <TabsContent value="financeiro" className="space-y-6" forceMount>
        <BarberFinancialDashboard barberId={selectedBarber} isActive={activeTab === 'financeiro'} />
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
                      <span>Meus Vales</span>
                      {loadingAdvances ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {advances.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum vale registrado.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Pendentes:{" "}
                          <span className="font-semibold">
                            {advances.filter((a) => a.status === "pending").length}
                          </span>{" "}
                          • Aprovados:{" "}
                          <span className="font-semibold">
                            {advances.filter((a) => a.status === "approved").length}
                          </span>
                        </p>
                        <div className="max-h-40 overflow-y-auto space-y-2 text-sm">
                          {advances.slice(0, 5).map((adv) => (
                            <div
                              key={adv.id}
                              className="flex items-center justify-between border border-border/60 rounded-md px-2 py-1 text-xs"
                            >
                              <div className="space-y-1">
                                <p className="font-medium">
                                  R${" "}
                                  {Number(adv.amount).toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    adv.effective_date
                                  ).toLocaleDateString("pt-BR")}
                                  {adv.description
                                    ? ` • ${adv.description.slice(0, 40)}${
                                        adv.description.length > 40 ? "..." : ""
                                      }`
                                    : ""}
                                </p>
                              </div>
                              {adv.status === "pending" && currentBarber && (
                                <div className="flex flex-col gap-1 items-end">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      const signatureMeta = {
                                        barber_id: currentBarber.id,
                                        barber_name: currentBarber.name,
                                      };
                                      const { error } = await approveAdvance(
                                        adv.id,
                                        signatureMeta
                                      );
                                      if (error) {
                                        toast.error(
                                          "Erro ao aprovar vale: " + error.message
                                        );
                                      } else {
                                        toast.success(
                                          "Vale aprovado. O valor será descontado da sua comissão."
                                        );
                                        loadAdvances();
                                      }
                                    }}
                                  >
                                    Aprovar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 px-2"
                                    onClick={async () => {
                                      const { error } = await rejectAdvance(adv.id);
                                      if (error) {
                                        toast.error(
                                          "Erro ao rejeitar/cancelar vale: " +
                                            error.message
                                        );
                                      } else {
                                        toast.success("Vale rejeitado/cancelado.");
                                        loadAdvances();
                                      }
                                    }}
                                  >
                                    Rejeitar
                                  </Button>
                                </div>
                              )}
                              {adv.status === "approved" && (
                                <span className="text-xs text-green-500 font-medium">
                                  Aprovado
                                </span>
                              )}
                              {adv.status === "rejected" && (
                                <span className="text-xs text-red-500 font-medium">
                                  Rejeitado
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="historico" className="space-y-6" forceMount>
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Histórico de Serviços</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        onClick={() => setShowHistoryFilters((v) => !v)}
                      >
                        {showHistoryFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Filtros */}
                    <div className={`mb-4 pb-3 border-b border-border ${showHistoryFilters ? '' : 'hidden'}`}>
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
                            <DropdownMenuRadioGroup value={historyFilterPeriod} onValueChange={(v) => setHistoryFilterPeriod(v as any)}>
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
                                historyFilterStatus === 'confirmed' ? 'Confirmado' : 'Cancelado'
                              }
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={historyFilterStatus} onValueChange={(v) => setHistoryFilterStatus(v as any)}>
                              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="completed">Concluído</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="confirmed">Confirmado</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="cancelled">Cancelado</DropdownMenuRadioItem>
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

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2 text-xs w-full truncate justify-center">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pagamento: {historyFilterPayment === 'all' ? 'Todos' : historyFilterPayment === 'pix' ? 'Pix' : 'Dinheiro'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel className="text-xs">Pagamento</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={historyFilterPayment} onValueChange={(v) => setHistoryFilterPayment(v as any)}>
                              <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="pix">Pix</DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="dinheiro">Dinheiro</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {(() => {
                      const filteredAppointments = getFilteredHistoryAppointments();
                      return filteredAppointments.length > 0 ? (
                        <div className="space-y-3">
                          {filteredAppointments.map((appointment) => (
                          <div key={appointment.id} className={`p-3 rounded-lg border ${
                            appointment.status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
                            appointment.status === 'confirmed' ? 'bg-blue-500/10 border-blue-500/30' :
                            appointment.status === 'cancelled' ? 'bg-red-500/10 border-red-500/30' :
                            'bg-yellow-500/10 border-yellow-500/30'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-base">{appointment.service?.title || 'Serviço'}</p>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    appointment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                    appointment.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                                    appointment.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {appointment.status === 'completed' ? 'Concluído' :
                                     appointment.status === 'confirmed' ? 'Confirmado' :
                                     appointment.status === 'cancelled' ? 'Cancelado' :
                                     'Pendente'}
                                  </span>
                                  {/* Badge para agendamentos manuais/retroativos */}
                                  {appointment.booking_type === 'manual' && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30" title="Agendamento criado manualmente pelo barbeiro">
                                      📝 Manual
                                    </span>
                                  )}
                                  {/* Badge para forma de pagamento (apenas concluídos) */}
                                  {appointment.status === 'completed' && (
                                    <>
                                      {/* Verifica se tem pagamentos parciais */}
                                      {appointment.appointment_payments && appointment.appointment_payments.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {appointment.appointment_payments.map((payment, idx) => (
                                            <span key={idx} className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                                              {payment.payment_method === 'pix' ? '💳 Pix' : 
                                               payment.payment_method === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}: R$ {Number(payment.amount).toFixed(2)}
                                            </span>
                                          ))}
                                        </div>
                                      ) : appointment.payment_method ? (
                                        // Fallback para método único antigo
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary">
                                          {appointment.payment_method === 'pix' ? '💳 Pix' : 
                                           appointment.payment_method === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                                <p className="text-xs font-medium">Cliente: {appointment.client?.name ?? 'Cliente'}</p>
                                <div className="flex items-center gap-2">
                                  {appointment.client?.phone ? (
                                    <a 
                                      href={`https://wa.me/${formatWhatsappNumber(appointment.client.phone)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      Tel: {appointment.client.phone}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Sem telefone</span>
                                  )}
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                                    onClick={() => handleWhatsAppClick(appointment)}
                                    title="Falar no WhatsApp"
                                  >
                                    <Smartphone className="h-3 w-3" />
                                    WhatsApp
                                  </Button>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(appointment.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-bold text-primary">{appointment.appointment_time.slice(0, 5)}</span>
                                  </div>
                                  {appointment.service?.price && (
                                    <div className="text-primary font-bold">
                                      R$ {appointment.service.price.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                                {appointment.photo_url && (
                                  <div className="mt-3">
                                    <button
                                      type="button"
                                      className="w-full max-w-xs h-40 rounded-lg border border-border overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                                      onClick={() => {
                                        setPhotoModalUrl(appointment.photo_url as string);
                                        setPhotoModalOpen(true);
                                      }}
                                    >
                                      <img 
                                        src={appointment.photo_url} 
                                        alt="Foto do corte" 
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        {appointments.length === 0 
                          ? 'Nenhum serviço registrado ainda'
                          : 'Nenhum agendamento encontrado com os filtros selecionados'}
                      </p>
                    );
                    })()}
                  </CardContent>
                </Card>
                
                <Card className="bg-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Histórico de Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingProductHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (() => {
                      const sales = getFilteredProductHistory();
                      return sales.length > 0 ? (
                        <div className="space-y-3">
                          {sales.map((sale) => (
                            <div key={sale.id} className="p-3 rounded-lg border bg-secondary/20 border-border">
                              <div className="flex justify-between items-start gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm">{sale.product?.name || 'Produto'}</p>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      sale.status === 'confirmed' ? 'bg-green-500/20 text-green-500' :
                                      sale.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
                                      'bg-red-500/20 text-red-500'
                                    }`}>
                                      {sale.status === 'confirmed' ? 'Confirmado' : sale.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                    </span>
                                  </div>
                                  {sale.notes && (
                                    <p className="text-xs text-muted-foreground">{sale.notes}</p>
                                  )}
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3 w-3" />
                                      <span>{new Date(sale.sale_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      <span className="font-bold text-primary">{String(sale.sale_time).slice(0,5)}</span>
                                    </div>
                                    <div className="text-primary font-bold">
                                      R$ {Number(sale.total_price).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs text-right min-w-[80px]">
                                  <div className="text-muted-foreground">Qtd</div>
                                  <div className="font-semibold">{sale.quantity}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma venda de produto encontrada no período selecionado
                        </p>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}


        <Dialog 
          open={photoModalOpen} 
          onOpenChange={(open) => {
            setPhotoModalOpen(open);
            if (!open) {
              setPhotoModalUrl(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            {photoModalUrl && (
              <img 
                src={photoModalUrl} 
                alt="Foto do corte" 
                className="w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de ação ao clicar no agendamento (Concluir ou Cancelar) */}
        <Dialog 
          open={actionDialogOpen} 
          onOpenChange={(open) => {
            setActionDialogOpen(open);
            if (!open) {
              setSelectedAppointmentForAction(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>O que deseja fazer?</DialogTitle>
              {selectedAppointmentForAction && (
                <DialogDescription>
                  Serviço: <span className="font-semibold">{selectedAppointmentForAction.service?.title || 'Serviço'}</span><br />
                  Cliente: <span className="font-semibold">{selectedAppointmentForAction.client?.name || selectedAppointmentForAction.client_name || 'Local'}</span><br />
                  Data: {new Date(selectedAppointmentForAction.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedAppointmentForAction.appointment_time.slice(0, 5)}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (!selectedAppointmentForAction) return;
                  handleWhatsAppClick(selectedAppointmentForAction);
                }}
              >
                Falar com o Cliente (WhatsApp)
              </Button>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (!selectedAppointmentForAction) return;
                  setAppointmentToComplete(selectedAppointmentForAction.id);
                  setActionDialogOpen(false);
                  setCompleteDialogOpen(true);
                }}
              >
                Concluir atendimento
              </Button>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  if (!selectedAppointmentForAction) return;
                  handleEditClick(selectedAppointmentForAction);
                }}
              >
                Alterar Data/Hora
              </Button>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => {
                  if (!selectedAppointmentForAction) return;
                  setAppointmentToCancel(selectedAppointmentForAction.id);
                  setCancellationReason('');
                  setActionDialogOpen(false);
                  setCancelDialogOpen(true);
                }}
              >
                Cancelar agendamento
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setActionDialogOpen(false)}
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para adicionar foto ao concluir */}
        <Dialog 
          open={completeDialogOpen} 
          onOpenChange={(open) => {
            setCompleteDialogOpen(open);
            if (!open) {
              setCurrentPaymentMethod('pix');
              setPhotoFile(null);
              setPhotoPreview(null);
              setPayments([]);
              setCurrentPaymentAmount('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Concluir Atendimento</DialogTitle>
              {appointmentToComplete && selectedAppointmentForAction && (
                <DialogDescription>
                  Cliente: <span className="font-semibold">{selectedAppointmentForAction.client?.name || selectedAppointmentForAction.client_name || 'Local'}</span><br />
                  Serviço: <span className="font-semibold">{selectedAppointmentForAction.service?.title || 'Serviço'}</span><br />
                  Data: {new Date(selectedAppointmentForAction.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedAppointmentForAction.appointment_time.slice(0, 5)}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Tire uma foto do corte realizado para concluir o atendimento.
              </p>
              
              <div className="w-full h-64 border-2 border-dashed border-border rounded-lg overflow-hidden flex items-center justify-center bg-black relative">
                {photoPreview ? (
                  <>
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => {
                          setPhotoFile(null);
                          setPhotoPreview(null);
                          fileInputRef.current?.click();
                        }}
                      >
                        <Camera className="w-4 h-4" />
                        Tirar outra foto
                      </Button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground gap-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="font-semibold text-sm text-foreground">Tirar foto</span>
                    <span className="text-xs text-muted-foreground">A câmera do aparelho será aberta</span>
                  </button>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Campo de forma de pagamento */}
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="space-y-2 flex-1">
                    <Label className="text-sm font-medium">Forma de Pagamento</Label>
                    <Select
                      value={currentPaymentMethod}
                      onValueChange={setCurrentPaymentMethod}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-primary" />
                            <span>Pix</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dinheiro">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-green-500" />
                            <span>Dinheiro</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="cartao">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-blue-500" />
                            <span>Cartão</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 w-32">
                    <Label className="text-sm font-medium">Valor</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={currentPaymentAmount}
                      onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                    />
                  </div>

                  <Button onClick={handleAddPayment} type="button" size="icon" className="mb-0.5 shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Lista de pagamentos adicionados */}
                {payments.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold">Pagamentos Registrados</Label>
                    {payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-background p-2 rounded border">
                        <div className="flex items-center gap-2">
                          {p.method === 'pix' && <Smartphone className="h-4 w-4 text-primary" />}
                          {p.method === 'dinheiro' && <Banknote className="h-4 w-4 text-green-500" />}
                          {p.method === 'cartao' && <CreditCard className="h-4 w-4 text-blue-500" />}
                          <span className="capitalize">{p.method}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            {p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <button 
                            onClick={() => handleRemovePayment(idx)}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded-full transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                      <span className="font-bold">Total Pago</span>
                      <span className="font-bold text-lg text-green-600">
                        {getTotalPaid().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                )}
                
                {payments.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                        Adicione os pagamentos recebidos (Pix, Dinheiro, Cartão)
                    </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCompleteWithPhoto}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Concluir {photoFile ? 'com Foto' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para cancelar agendamento */}
        <Dialog 
          open={cancelDialogOpen} 
          onOpenChange={(open) => {
            setCancelDialogOpen(open);
            if (!open) {
              setAppointmentToCancel(null);
              setCancellationReason('');
            }
          }}
        >
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
                  placeholder="Ex: Cliente não compareceu, Impedimento de última hora, etc."
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

        <Dialog 
          open={whatsappDialogOpen}
          onOpenChange={(open) => {
            setWhatsappDialogOpen(open);
            if (!open) {
              setWhatsappAppointment(null);
              setWhatsappNumber('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Falar no WhatsApp</DialogTitle>
              {whatsappAppointment && (
                <DialogDescription>
                  Cliente: <span className="font-semibold">{whatsappAppointment.client?.name ?? 'Cliente'}</span>
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Número do WhatsApp (cadastro)</Label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleSavePhoneAndOpenWhatsApp}
                  disabled={!whatsappNumber}
                >
                  Salvar no perfil e abrir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar agendamento */}
        <Dialog 
          open={editDialogOpen} 
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setAppointmentToEdit(null);
              setEditAppointment({ date: '', time: '' });
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Alterar Data e Hora</DialogTitle>
              {appointmentToEdit && (
                <DialogDescription>
                  Serviço: <span className="font-semibold">{appointmentToEdit.service?.title || 'Serviço'}</span><br />
                  Cliente: <span className="font-semibold">{appointmentToEdit.client?.name ?? 'Cliente'}</span>
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-date">Nova Data *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editAppointment.date}
                  onChange={(e) => setEditAppointment({ ...editAppointment, date: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-time">Novo Horário *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editAppointment.time}
                  onChange={(e) => setEditAppointment({ ...editAppointment, time: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    setEditDialogOpen(false);
                    setAppointmentToEdit(null);
                    setEditAppointment({ date: '', time: '' });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BarbeiroDashboard;
