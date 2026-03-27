import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Scissors, Wind, Sparkles, User, Star, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useOperatingHours, getDayKey } from "@/hooks/useOperatingHours";
import { getAvailableSlotsForBarber } from "@/utils/availability";
import haircutImg from "@/assets/service-haircut.jpg";
import beardImg from "@/assets/service-beard.jpg";
import stylingImg from "@/assets/service-styling.jpg";
import barber1Img from "@/assets/barber-1.jpg";
import barber2Img from "@/assets/barber-2.jpg";
import barber3Img from "@/assets/barber-3.jpg";

const defaultImages: Record<string, any> = {
  'Corte de Cabelo': haircutImg,
  'Barba & Bigode': beardImg,
  'Finalização': stylingImg,
};

const defaultBarberImages: Record<number, any> = {
  0: barber1Img,
  1: barber2Img,
  2: barber3Img,
};

const getServiceDuration = (serviceId: string, services: any[]) => {
  const service = services.find(s => s.id === serviceId);
  return service?.duration || 30; // Default 30 minutos
};

const addMinutesToTime = (time: string, minutes: number) => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

const isTimeConflict = (newTime: string, duration: number, existingAppointments: any[], breaks: any[] = []) => {
  const newEndTime = addMinutesToTime(newTime, duration);
  
  // 1. Check for conflicts with existing appointments
  const hasAppointmentConflict = existingAppointments.some(apt => {
    const aptDuration = apt.service?.duration || 30;
    const aptEndTime = addMinutesToTime(apt.appointment_time, aptDuration);
    
    // Check if time ranges overlap
    return (newTime < aptEndTime && newEndTime > apt.appointment_time);
  });

  if (hasAppointmentConflict) return true;

  // 2. Check for conflicts with breaks
  const hasBreakConflict = breaks.some(br => {
    // Check if time ranges overlap
    return (newTime < br.end_time && newEndTime > br.start_time);
  });

  return hasBreakConflict;
};

const Booking = () => {
  const { user, blocked } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { getTimeSlotsForDate, isDateOpen, loading: hoursLoading } = useOperatingHours();
  const [step, setStep] = useState<"service" | "barber" | "time" | "form" | "success">("service");
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [barbershopAddress, setBarbershopAddress] = useState<string>("");
  const [barbershopMapsLink, setBarbershopMapsLink] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    service: "",
    serviceTitle: "",
    servicePrice: "",
    barber: "",
    barberName: "",
    date: "",
    time: "",
  });
  const [confirmedBooking, setConfirmedBooking] = useState<{
    serviceTitle: string;
    servicePrice: string;
    barberName: string;
    date: string;
    time: string;
  } | null>(null);

  // Estados para o modal de confirmação de barbeiro indisponível
  const [unavailableBarberDialogOpen, setUnavailableBarberDialogOpen] = useState(false);
  const [selectedUnavailableBarber, setSelectedUnavailableBarber] = useState<any>(null);
  
  // Estado para nome de cliente personalizado (para agendar para outra pessoa)
  const [customClientName, setCustomClientName] = useState("");
  const [hasClientNameColumn, setHasClientNameColumn] = useState(true);
  const [hasBarberBreaks, setHasBarberBreaks] = useState(true);
  const [selectedDateBreaks, setSelectedDateBreaks] = useState<{ start_time: string; end_time: string }[]>([]);
  const [barberHasSlotsToday, setBarberHasSlotsToday] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const { error } = await (supabase as any)
          .from('appointments')
          .select('client_name')
          .limit(1);
        if (error) {
          setHasClientNameColumn(false);
        }
      } catch {
        setHasClientNameColumn(false);
      }
    })();
  }, []);

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

  // Carregar dados iniciais apenas uma vez (não quando estiver no step success)
  useEffect(() => {
    if (step === "success") return;
    
    loadServices();
    loadBarbers();
    loadBarbershopAddress();
    
    if (user) {
      loadUserProfile();
    }
  }, [user, step]);

  // Gerenciar serviço pré-selecionado (separado do carregamento de dados)
  useEffect(() => {
    // Não fazer nada se estiver na tela de sucesso ou se já estiver em um step avançado
    if (step === "success" || step === "time" || step === "form") return;
    
    // Não fazer nada se já tiver um barbeiro selecionado (já passou da etapa de seleção de barbeiro)
    if (formData.barber) return;
    
    // Check if service was pre-selected from navigation state
    const checkPreSelectedService = () => {
      if (location.state?.preSelectedService) {
        const service = location.state.preSelectedService;
        setFormData(prev => ({
          ...prev,
          service: service.id,
          serviceTitle: service.title,
          servicePrice: service.price,
        }));
        setStep("barber");
        
        // Scroll to this section AFTER changing step
        setTimeout(() => {
          const bookingSection = document.getElementById('agendamento');
          if (bookingSection) {
            bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
        
        // Clear the state to prevent re-triggering
        window.history.replaceState({}, document.title);
      }
    };
    
    checkPreSelectedService();
    
    // Listen for popstate events (when Services component triggers navigation)
    window.addEventListener('popstate', checkPreSelectedService);
    
    return () => {
      window.removeEventListener('popstate', checkPreSelectedService);
    };
  }, [location, step, formData.barber]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('name, phone')
      .eq('id', user.id)
      .single();

    // Tentar pegar telefone também do user_metadata (onde está salvo o WhatsApp no cadastro por CPF)
    const metaPhone = (user as any)?.user_metadata?.whatsapp || (user as any)?.user_metadata?.phone || '';

    if (data && !error) {
      // Preservar dados do agendamento: só atualizar se os campos estiverem vazios
      setFormData(prev => {
        // Se já tiver nome e telefone preenchidos, não sobrescrever (pode ser dados do agendamento)
        // Isso preserva os dados quando estiver no step success
        return {
          ...prev,
          name: prev.name || data.name || '',
          phone: prev.phone || data.phone || metaPhone || prev.phone || '',
        };
      });
    } else if (metaPhone) {
      // Se não achou profile mas tem telefone no metadata, ainda assim preenche
      setFormData(prev => ({
        ...prev,
        phone: prev.phone || metaPhone,
      }));
    }
  };

  const loadBarbershopAddress = async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .maybeSingle();

    if (!error && data) {
      const footerInfo = data.config_value as any;
      if (footerInfo?.address) {
        setBarbershopAddress(footerInfo.address);
      }
      // Carregar o link do Google Maps se existir
      if (footerInfo?.maps_link) {
        setBarbershopMapsLink(footerInfo.maps_link);
      }
    }
  };

  const getGoogleMapsLink = (): string => {
    // Priorizar o link salvo do Google Maps
    if (barbershopMapsLink) {
      return barbershopMapsLink;
    }
    // Se não tiver link, gerar a partir do endereço
    if (barbershopAddress) {
      // Se o endereço já for um link, usar diretamente
      if (barbershopAddress.includes('http://') || barbershopAddress.includes('https://')) {
        return barbershopAddress;
      }
      // Gerar link do Google Maps a partir do endereço
      const encodedAddress = encodeURIComponent(barbershopAddress);
      return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
    return '#';
  };

  const loadServices = async () => {
    // Load services
    const { data: servicesData, error: servicesError } = await (supabase as any)
      .from('services')
      .select('*')
      .eq('visible', true);

    if (servicesError) {
      console.error('Error loading services:', servicesError);
      return;
    }

    if (!servicesData || servicesData.length === 0) {
      setServices([]);
      return;
    }

    // Count appointments per service
    const { data: appointmentsData, error: appointmentsError } = await (supabase as any)
      .from('appointments')
      .select('service_id')
      .neq('status', 'cancelled');

    if (appointmentsError) {
      console.error('Error loading appointments count:', appointmentsError);
      // If error, just use services with default order
      setServices(servicesData);
      return;
    }

    // Count occurrences of each service
    const serviceCounts = new Map<string, number>();
    appointmentsData?.forEach((apt: any) => {
      if (apt.service_id) {
        serviceCounts.set(apt.service_id, (serviceCounts.get(apt.service_id) || 0) + 1);
      }
    });

    // Sort services by usage count (most used first), then by order_index
    const sortedServices = servicesData.sort((a: any, b: any) => {
      const countA = serviceCounts.get(a.id) || 0;
      const countB = serviceCounts.get(b.id) || 0;
      
      // First sort by usage count (descending)
      if (countB !== countA) {
        return countB - countA;
      }
      
      // If same count, sort by order_index
      return (a.order_index || 0) - (b.order_index || 0);
    });

    setServices(sortedServices);
  };

  const loadBarbers = async () => {
    const { data, error } = await (supabase as any)
      .from('barbers')
      .select('*')
      .eq('visible', true)
      .order('order_index');

    if (error) {
      console.error('Error loading barbers:', error);
    } else {
      setBarbers(data || []);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (step !== "barber" || !formData.service || barbers.length === 0) return;
      const today = new Date();
      const todayStr = formatLocalDate(today);
      const isOpen = isDateOpen(today);
      const serviceDuration = getServiceDuration(formData.service, services);
      const timeSlots = getTimeSlotsForDate(today);
      const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      const result: Record<string, boolean> = {};
      for (const barber of getAvailableBarbers()) {
        if (!isOpen) {
          result[barber.id] = false;
          continue;
        }
        let barberAvailableToday = true;
        if (barber.availability) {
          try {
            const availability = typeof barber.availability === 'string' ? JSON.parse(barber.availability) : barber.availability;
            const dayKey = getDayKey(today);
            const dayAvailability = availability?.[dayKey];
            barberAvailableToday = !dayAvailability?.closed;
          } catch {
            barberAvailableToday = true;
          }
        }
        if (!barberAvailableToday) {
          result[barber.id] = false;
          continue;
        }
        const { data: appointments } = await (supabase as any)
          .from('appointments')
          .select('appointment_time, service:services(duration)')
          .eq('barber_id', barber.id)
          .eq('appointment_date', todayStr)
          .neq('status', 'cancelled');
        const { data: breaks } = await (supabase as any)
          .from('barber_breaks')
          .select('start_time, end_time')
          .eq('barber_id', barber.id)
          .eq('date', todayStr);
        
        const availableTodaySlots = timeSlots.filter((slot) => {
          if (slot < currentTime) return false;
          const hasConflict = isTimeConflict(slot, serviceDuration, appointments || [], breaks || []);
          return !hasConflict;
        });
        result[barber.id] = availableTodaySlots.length > 0;
      }
      setBarberHasSlotsToday(result);
    };
    run();
  }, [step, formData.service, barbers, services]);

  // Filter barbers based on selected date and their availability
  const getAvailableBarbers = () => {
    if (!formData.date) return barbers;
    
    const selectedDate = new Date(formData.date + 'T00:00:00');
    return barbers.filter(barber => {
      if (!barber.availability) return true; // Backwards compatibility
      
      try {
        const availability = typeof barber.availability === 'string' 
          ? JSON.parse(barber.availability) 
          : barber.availability;
        
        const dayKey = getDayKey(selectedDate);
        const dayAvailability = availability[dayKey];
        
        return !dayAvailability?.closed;
      } catch (error) {
        console.error('Error parsing barber availability:', error);
        return true; // If error parsing, assume available
      }
    });
  };

  const handleServiceSelect = (service: typeof services[0]) => {
    setFormData({
      ...formData,
      service: service.id,
      serviceTitle: service.title,
      servicePrice: service.price,
    });
    setStep("barber");
  };

  const handleBarberSelect = async (barber: typeof barbers[0]) => {
    // Verificar se o barbeiro tem horários disponíveis hoje
    const today = new Date();
    const todayStr = formatLocalDate(today);
    
    // Verificar se hoje está dentro do horário de funcionamento
    const isTodayOpen = isDateOpen(today);
    
    // Verificar se o barbeiro está disponível hoje
    let barberAvailableToday = true;
    if (barber.availability) {
      try {
        const availability = typeof barber.availability === 'string' 
          ? JSON.parse(barber.availability) 
          : barber.availability;
        
        const dayKey = getDayKey(today);
        const dayAvailability = availability[dayKey];
        barberAvailableToday = !dayAvailability?.closed;
      } catch (error) {
        console.error('Error parsing barber availability:', error);
      }
    }

    // Se a barbearia está fechada hoje, pular verificação (não há horários mesmo)
    if (!isTodayOpen) {
      const newFormData = {
        ...formData,
        barber: barber.id,
        barberName: barber.name,
      };
      setFormData(newFormData);
      setStep("time");
      findNextAvailableDateTime(newFormData).catch((error) => {
        console.error('Error finding next available date/time:', error);
      });
      return;
    }

    // Se o barbeiro não está disponível hoje, mostrar modal de confirmação
    if (!barberAvailableToday) {
      setSelectedUnavailableBarber(barber);
      setUnavailableBarberDialogOpen(true);
      return;
    }

    // Verificar se há horários disponíveis hoje
    try {
      const todayTimeSlots = getTimeSlotsForDate(today);
      const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

      // Buscar agendamentos existentes para hoje
      const { data: appointments } = await (supabase as any)
        .from('appointments')
        .select('appointment_time, service:services(duration)')
        .eq('barber_id', barber.id)
        .eq('appointment_date', todayStr)
        .neq('status', 'cancelled');

      // Buscar pausas do barbeiro para hoje
      const { data: breaks } = await (supabase as any)
        .from('barber_breaks')
        .select('start_time, end_time')
        .eq('barber_id', barber.id)
        .eq('date', todayStr);

      const serviceDuration = getServiceDuration(formData.service, services);

      // Verificar se há horários disponíveis hoje
      const availableTodaySlots = todayTimeSlots.filter(slot => {
        // Permitir agendar o slot atual se ainda estivermos nos primeiros 10 minutos dele
        // Isso deve ser consistente com src/utils/availability.ts
        const [hour, minute] = slot.split(':').map(Number);
        const [currentHour, currentMinute] = currentTime.split(':').map(Number);
        const slotTotalMinutes = hour * 60 + minute;
        const nowTotalMinutes = currentHour * 60 + currentMinute;
        if (slotTotalMinutes < (nowTotalMinutes - 10)) {
          return false;
        }

        // Verificar conflitos com agendamentos existentes e pausas
        const hasConflict = isTimeConflict(slot, serviceDuration, appointments || [], breaks || []);
        return !hasConflict;
      });

      // Se não há horários disponíveis hoje, mostrar modal de confirmação
      if (availableTodaySlots.length === 0) {
        setSelectedUnavailableBarber(barber);
        setUnavailableBarberDialogOpen(true);
        return;
      }

      // Se há horários disponíveis hoje, continuar normalmente
      const newFormData = {
        ...formData,
        barber: barber.id,
        barberName: barber.name,
      };
      setFormData(newFormData);
      setStep("time");
      findNextAvailableDateTime(newFormData).catch((error) => {
        console.error('Error finding next available date/time:', error);
      });

    } catch (error) {
      console.error('Error checking barber availability for today:', error);
      // Em caso de erro, continuar normalmente
      const newFormData = {
        ...formData,
        barber: barber.id,
        barberName: barber.name,
      };
      setFormData(newFormData);
      setStep("time");
      findNextAvailableDateTime(newFormData).catch((error) => {
        console.error('Error finding next available date/time:', error);
      });
    }
  };

  // Função para confirmar agendamento com barbeiro indisponível hoje
  const handleConfirmUnavailableBarber = () => {
    if (!selectedUnavailableBarber) return;
    
    const newFormData = {
      ...formData,
      barber: selectedUnavailableBarber.id,
      barberName: selectedUnavailableBarber.name,
    };
    setFormData(newFormData);
    setUnavailableBarberDialogOpen(false);
    setSelectedUnavailableBarber(null);
    setStep("time");
    
    findNextAvailableDateTime(newFormData).catch((error) => {
      console.error('Error finding next available date/time:', error);
    });
  };

  // Função para cancelar e voltar à seleção de barbeiro
  const handleCancelUnavailableBarber = () => {
    setUnavailableBarberDialogOpen(false);
    setSelectedUnavailableBarber(null);
    // Permanecer na tela de seleção de barbeiro
  };

  // Helper function to format date in local timezone (not UTC)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const findNextAvailableDateTime = async (currentFormData: typeof formData) => {
    if (!currentFormData.service || !currentFormData.barber || hoursLoading) return;

    const today = new Date();
    const maxDaysToCheck = 30; // Check next 30 days
    const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    const todayStr = formatLocalDate(today);
    
    // Check if today has any slots left - if not, start from tomorrow
    let startOffset = 0;
    if (isDateOpen(today)) {
      const todaySlots = getTimeSlotsForDate(today);
      const hasSlotsToday = todaySlots.some(slot => slot >= currentTime);
      if (!hasSlotsToday) {
        startOffset = 1; // Start from tomorrow if today has no more slots
      }
    }
    
    for (let i = startOffset; i < maxDaysToCheck; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateStr = formatLocalDate(checkDate);
      
      // Check if date is open for the barbershop
      const dateIsOpen = isDateOpen(checkDate);
      
      // Check if barber is available on this date
      const selectedBarber = barbers.find(b => b.id === currentFormData.barber);
      let barberAvailable = true;
      if (selectedBarber?.availability) {
        try {
          const availability = typeof selectedBarber.availability === 'string' 
            ? JSON.parse(selectedBarber.availability) 
            : selectedBarber.availability;
          const dayKey = getDayKey(checkDate);
          const dayAvailability = availability[dayKey];
          barberAvailable = !dayAvailability?.closed;
        } catch (error) {
          console.error('Error parsing barber availability:', error);
        }
      }
      
      // Skip closed days or days when barber is unavailable
      if (!dateIsOpen || !barberAvailable) {
        continue;
      }
      
      const dayTimeSlots = getTimeSlotsForDate(checkDate);
      
      const { data: appointments } = await (supabase as any)
        .from('appointments')
        .select('appointment_time, service:services(duration)')
        .eq('barber_id', currentFormData.barber)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      // Query barber breaks for this date
      const { data: breaks, error: breaksError } = await (supabase as any)
        .from('barber_breaks')
        .select('start_time, end_time')
        .eq('barber_id', currentFormData.barber)
        .eq('date', dateStr);
      
      // Adicionar verificação de almoço
      let lunchBreak: { start_time: string; end_time: string } | null = null;
      try {
        const barber = barbers.find(b => b.id === currentFormData.barber);
        if (barber?.availability) {
          const availability = typeof barber.availability === 'string'
            ? JSON.parse(barber.availability)
            : barber.availability;
          const dayKey = getDayKey(checkDate);
          const dayAvailability = availability?.[dayKey];
          if (dayAvailability?.hasLunchBreak && dayAvailability.lunchStart && dayAvailability.lunchEnd) {
            lunchBreak = {
              start_time: dayAvailability.lunchStart,
              end_time: dayAvailability.lunchEnd,
            };
          }
        }
      } catch (e) { console.warn('Falha ao validar almoço em findNextAvailableDateTime:', e); }

      const combinedBreaks = [
        ...(breaks || []),
        ...(lunchBreak ? [lunchBreak] : []),
      ];

      // Ignore 404/table not found errors (table might not exist)
      if (breaksError && breaksError.code !== 'PGRST116' && breaksError.code !== 'PGRST205' && breaksError.code !== '42P01') {
        console.warn('Error loading barber breaks:', breaksError);
      }

      const serviceDuration = getServiceDuration(currentFormData.service, services);
      
      // Filter out past times if it's today
      const isToday = checkDate.toDateString() === today.toDateString();
      const currentTimeLocal = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      
      const availableSlots = dayTimeSlots.filter(slot => {
        // Permitir agendar o slot atual se ainda estivermos nos primeiros 10 minutos dele
        // Isso deve ser consistente com src/utils/availability.ts
        if (isToday) {
          const [hour, minute] = slot.split(':').map(Number);
          const [currentHour, currentMinute] = currentTimeLocal.split(':').map(Number);
          const slotTotalMinutes = hour * 60 + minute;
          const nowTotalMinutes = currentHour * 60 + currentMinute;
          if (slotTotalMinutes < (nowTotalMinutes - 10)) {
            return false;
          }
        }

        const hasConflict = isTimeConflict(slot, serviceDuration, appointments || [], combinedBreaks);
        return !hasConflict;
      });

      if (availableSlots.length > 0) {
        // Found a date with available slots
        
        setFormData(prev => ({
          ...prev,
          date: dateStr,
          time: availableSlots[0], // Pre-select first available time
        }));
        setAvailableSlots(availableSlots);
        return;
      }
    }
    
    // No available slots found in next 30 days
    setAvailableSlots([]);
  };

  useEffect(() => {
    if (step !== "success" && formData.date && formData.barber && formData.service && !hoursLoading) {
      loadAvailableSlots();
    }

    // Realtime subscription for appointments changes (apenas quando necessário)
    let channel: any = null;
    if (step !== "success" && formData.date && formData.barber && formData.service && !hoursLoading) {
      channel = supabase
        .channel('booking-appointments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `barber_id=eq.${formData.barber}`,
          },
          () => {
            // Forçar reload completo ao invés de debounce para evitar inconsistências
            console.log('Appointment change detected, forcing full reload...');
            setTimeout(() => {
              if (formData.date && formData.barber && formData.service) {
                // Limpar cache local antes de recarregar
                setAvailableSlots([]);
                loadAvailableSlots();
              }
            }, 300);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [formData.date, formData.barber, formData.service, hoursLoading, step]);

  const loadAvailableSlots = async () => {
    if (loadingSlots) return; // Prevenir múltiplas chamadas simultâneas
    setLoadingSlots(true);
    try {
      const slots = await getAvailableSlotsForDate();
      setAvailableSlots(slots);
      
      // Auto-select only while the user is choosing a time.
      // Never overwrite the selected time on form/success steps, otherwise the
      // confirmation screen can show the next free slot instead of the real booking.
      if (slots.length > 0) {
        // Check if current selected time is still available in new slots
        const currentTimeStillAvailable = formData.time && slots.includes(formData.time);
        
        if (step === "time" && !currentTimeStillAvailable) {
          setFormData(prev => ({
            ...prev,
            time: slots[0],
          }));
        }
      } else if (step === "time") {
        // No slots available, clear time selection
        setFormData(prev => ({
          ...prev,
          time: "",
        }));
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      toast.error('Erro ao carregar horários disponíveis', {
        description: 'Tente recarregar a página.',
      });
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const getAvailableSlotsForDate = async () => {
    if (!formData.date || !formData.barber || !formData.service || hoursLoading) return [];

    try {
      const selectedDate = new Date(formData.date + 'T00:00:00');
      
      // Respeitar disponibilidade diária do barbeiro (dias fechados e almoço)
      const selectedBarber = barbers.find(b => b.id === formData.barber);
      let lunchBreak: { start_time: string; end_time: string } | null = null;
      
      // 1. Verificar almoço na disponibilidade do barbeiro (prioridade)
      if (selectedBarber?.availability) {
        try {
          const availability = typeof selectedBarber.availability === 'string'
            ? JSON.parse(selectedBarber.availability)
            : selectedBarber.availability;
          const dayKey = getDayKey(selectedDate);
          const dayAvailability = availability?.[dayKey];
          if (dayAvailability?.closed) {
            return [];
          }
          if (dayAvailability?.hasLunchBreak && dayAvailability.lunchStart && dayAvailability.lunchEnd) {
            lunchBreak = {
              start_time: dayAvailability.lunchStart,
              end_time: dayAvailability.lunchEnd,
            };
          }
        } catch (err) {
          console.error('Error parsing barber availability (getAvailableSlotsForDate):', err);
        }
      }
      
      // 2. Se não tiver almoço configurado no barbeiro, usar almoço da barbearia (fallback)
      if (!lunchBreak) {
        try {
          const { data: shopHours } = await supabase
            .from('site_config')
            .select('config_value')
            .eq('config_key', 'operating_hours')
            .maybeSingle();
          
          if (shopHours?.config_value) {
            const operatingHours = shopHours.config_value as any;
            const dayKey = getDayKey(selectedDate);
            const dayHours = operatingHours?.[dayKey];
            
            if (dayHours?.hasLunchBreak && dayHours.lunchStart && dayHours.lunchEnd) {
              lunchBreak = {
                start_time: dayHours.lunchStart,
                end_time: dayHours.lunchEnd,
              };
            }
          }
        } catch (err) {
          console.error('Error loading shop operating hours for lunch break:', err);
        }
      }
      
      // 3. BLOQUEIO FORÇADO: Se for sábado e não tiver almoço configurado, aplicar almoço padrão (12:00-14:00)
      const dayKey = getDayKey(selectedDate);
      if (!lunchBreak && dayKey === 'saturday') {
        lunchBreak = {
          start_time: '12:00',
          end_time: '14:00',
        };
      }
      
      // Check if barbershop is open on this day
      if (!isDateOpen(selectedDate)) return [];
      const { data: appointments, error: appointmentsError } = await (supabase as any)
        .from('appointments')
        .select('appointment_time, service:services(duration)')
        .eq('barber_id', formData.barber)
        .eq('appointment_date', formData.date)
        .neq('status', 'cancelled');

      if (appointmentsError) {
        console.error('Error loading appointments:', appointmentsError);
        return [];
      }

      // Query barber breaks for the selected date
      const { data: breaks, error: breaksError } = await (supabase as any)
        .from('barber_breaks')
        .select('start_time, end_time')
        .eq('barber_id', formData.barber)
        .eq('date', formData.date);
      
      const combinedBreaks = [
        ...(breaks || []),
        ...(lunchBreak ? [lunchBreak] : []),
      ];

      // Atualizar estado para exibir faixa de pausas (incluindo almoço recorrente)
      setSelectedDateBreaks(combinedBreaks);
    
      // Ignore 404/table not found errors (table might not exist)
      if (breaksError && breaksError.code !== 'PGRST116' && breaksError.code !== 'PGRST205' && breaksError.code !== '42P01') {
        console.warn('Error loading barber breaks:', breaksError);
      }

    // Base slots compartilhados com o agendamento local (sincronização)
    const baseSlots = getAvailableSlotsForBarber(
      selectedDate,
      getTimeSlotsForDate,
      (appointments || []).map((a: any) => ({
        appointment_time: a.appointment_time,
        duration: a.service?.duration,
      })),
      { filterPastSlots: true, breaks: combinedBreaks }
    );
    // Ajustar pelos conflitos do serviço selecionado (duração)
    const serviceDuration = getServiceDuration(formData.service, services);
    return baseSlots.filter(slot =>
      !isTimeConflict(slot, serviceDuration, appointments || [], combinedBreaks)
    );
    } catch (error) {
      console.error('Error in getAvailableSlotsForDate:', error);
      return [];
    }
  };


  const handleTimeSelect = (time: string) => {
    try {
      setFormData({
        ...formData,
        time: time,
      });
      setStep("form");
    } catch (error) {
      console.error('Error in handleTimeSelect:', error);
      toast.error('Erro ao selecionar horário', {
        description: 'Tente novamente.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return; // Prevenir múltiplos submits

    if (!user) {
      toast.error("Você precisa fazer login para agendar", {
        description: "Redirecionando para a página de login...",
      });
      setTimeout(() => navigate('/auth'), 1500);
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error("Configuração do Supabase ausente", {
        description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para confirmar agendamentos.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Verificar se o barbeiro está fechado neste dia
      const selectedDate = new Date(formData.date + 'T00:00:00');
      const selectedBarber = barbers.find(b => b.id === formData.barber);
      let lunchBreak: { start_time: string; end_time: string } | null = null;

      try {
        if (selectedBarber?.availability) {
          const availability = typeof selectedBarber.availability === 'string'
            ? JSON.parse(selectedBarber.availability)
            : selectedBarber.availability;
          const dayKey = getDayKey(selectedDate);
          const dayAvailability = availability?.[dayKey];
          if (dayAvailability?.closed) {
            toast.error("Barbeiro indisponível nesta data", {
              description: "Este barbeiro bloqueou a agenda para este dia.",
            });
            return;
          }
          if (dayAvailability?.hasLunchBreak && dayAvailability.lunchStart && dayAvailability.lunchEnd) {
            lunchBreak = {
              start_time: dayAvailability.lunchStart,
              end_time: dayAvailability.lunchEnd,
            };
          }
        }
      } catch (err) {
        console.warn('Falha ao validar disponibilidade diária do barbeiro:', err);
      }
      
      // 1. Verificações rápidas em paralelo
      const [existingAppointmentResult, breaksResult, shopHoursResult] = await Promise.allSettled([
        // Verificar se já existe agendamento no mesmo horário
        (supabase as any)
          .from('appointments')
          .select('id')
          .eq('barber_id', formData.barber)
          .eq('appointment_date', formData.date)
          .eq('appointment_time', formData.time)
          .neq('status', 'cancelled')
          .maybeSingle(),
        
        // Verificar pausas do barbeiro
        hasBarberBreaks
          ? (supabase as any)
              .from('barber_breaks')
              .select('start_time, end_time')
              .eq('barber_id', formData.barber)
              .eq('date', formData.date)
          : Promise.resolve({ data: [] }),

        // Carregar almoço da loja se necessário
        !lunchBreak
          ? supabase
              .from('site_config')
              .select('config_value')
              .eq('config_key', 'operating_hours')
              .maybeSingle()
          : Promise.resolve({ data: null })
      ]);

      // Processar almoço da loja se fallback for necessário
      if (!lunchBreak && shopHoursResult.status === 'fulfilled' && shopHoursResult.value.data) {
        const operatingHours = shopHoursResult.value.data.config_value as any;
        const dayKey = getDayKey(selectedDate);
        const dayHours = operatingHours?.[dayKey];
        if (dayHours?.hasLunchBreak && dayHours.lunchStart && dayHours.lunchEnd) {
          lunchBreak = {
            start_time: dayHours.lunchStart,
            end_time: dayHours.lunchEnd,
          };
        }
      }

      // BLOQUEIO FORÇADO: Sábado almoço padrão
      const dayKey = getDayKey(selectedDate);
      if (!lunchBreak && dayKey === 'saturday') {
        lunchBreak = { start_time: '12:00', end_time: '14:00' };
      }

      // Verificar conflito de horário
      if (existingAppointmentResult.status === 'fulfilled' && existingAppointmentResult.value.data) {
        toast.error("Horário já está ocupado", {
          description: "Por favor, escolha outro horário disponível.",
        });
        return;
      }

      // Verificar pausas do barbeiro (incluindo almoço)
      const serviceDuration = getServiceDuration(formData.service, services);
      const manualBreaks = breaksResult.status === 'fulfilled' ? (breaksResult.value.data || []) : [];
      const combinedBreaks = [...manualBreaks, ...(lunchBreak ? [lunchBreak] : [])];

      const isInBreak = isTimeConflict(formData.time, serviceDuration, [], combinedBreaks);

      if (isInBreak) {
        toast.error("Horário indisponível", {
          description: "Este horário está em uma pausa do barbeiro. Por favor, escolha outro horário.",
        });
        return;
      }

      // 2. Bloqueio por CPF (perfil)
      try {
        const { data: profileBlock } = await (supabase as any)
          .from('profiles')
          .select('blocked, cpf')
          .eq('id', user.id)
          .maybeSingle();
        if (profileBlock?.blocked) {
          toast.error('CPF bloqueado para agendamento', {
            description: 'Entre em contato com a barbearia para desbloqueio.',
          });
          return;
        }
      } catch (e) {
        // Ignorar erro de leitura de bloqueio
      }

      // 3. Criar perfil se necessário
      const { data: existingProfile } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        await (supabase as any)
          .from('profiles')
          .upsert([{
            id: user.id,
            name: formData.name || user.user_metadata?.name || '',
            phone: formData.phone || user.user_metadata?.phone || '',
          }], { onConflict: 'id' });
      }

      // 4. Criar agendamento
      const payload: any = {
        client_id: user.id,
        service_id: formData.service,
        barber_id: formData.barber,
        appointment_date: formData.date,
        appointment_time: formData.time,
        status: 'confirmed',
        booking_type: 'online',
      };
      if (hasClientNameColumn) {
        payload.client_name = customClientName || formData.name;
      }

      const { data: newAppointment, error } = await (supabase as any)
        .from('appointments')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        toast.error("Erro ao criar agendamento", {
          description: error.message || "Falha na requisição.",
        });
        return;
      }

      // 5. Sucesso imediato
      setConfirmedBooking({
        serviceTitle: formData.serviceTitle,
        servicePrice: formData.servicePrice,
        barberName: formData.barberName,
        date: formData.date,
        time: formData.time,
      });
      toast.success("Agendamento realizado com sucesso!");
      setStep("success");

      // 6. Processar notificações em background
      processNotificationsAsync(newAppointment.id, formData, services, user);

    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error("Erro ao processar agendamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const processNotificationsAsync = async (appointmentId: string, formData: any, services: any[], user: any) => {
    try {
      const selectedService = services.find(s => s.id === formData.service);
      const duration = selectedService?.duration || 30;
      
      // Usar formato local sem conversão para UTC para evitar discrepâncias de fuso horário no webhook
      const localStartTime = `${formData.date}T${formData.time}:00`;
      const startDateTime = new Date(localStartTime);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      const localEndTime = `${formData.date}T${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}:00`;

      // Processar webhook e WhatsApp em paralelo
      const [webhookResult] = await Promise.allSettled([
        Promise.race([
          supabase.functions.invoke('api', {
            body: {
              action: 'notify-webhook',
              appointmentId,
              clientName: customClientName || formData.name,
              phone: formData.phone,
              service: selectedService?.title || 'Serviço',
              startTime: localStartTime,
              endTime: localEndTime,
              userId: user.id,
              notes: null,
            }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Webhook timeout')), 8000))
        ]),
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl) return;
          await fetch(`${supabaseUrl}/functions/v1/whatsapp-process-queue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey || '',
              'Authorization': session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({}),
          });
        })()
      ]);

      if (webhookResult.status === 'fulfilled') {
        console.log('✅ Webhook notification sent');
      } else {
        console.warn('⚠️ Webhook failed:', webhookResult.reason);
      }
    } catch (error) {
      console.warn('⚠️ Background notifications failed:', error);
    }
  };

  const handleBack = () => {
    if (step === "barber") setStep("service");
    else if (step === "time") setStep("barber");
    else if (step === "form") setStep("time");
  };

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(serviceSearch.toLowerCase())
  );
  const successBooking = confirmedBooking || formData;

  if (blocked) {
    return (
      <section id="agendamento" className="py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Agendamento indisponível</h2>
          <p className="text-destructive text-lg">Usuário bloqueado. Entre em contato com a barbearia.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="agendamento" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {step === "service" ? <>Selecione o <span className="bg-gradient-gold bg-clip-text text-transparent">Serviço</span></> :
             step === "barber" ? <>Escolha seu <span className="bg-gradient-gold bg-clip-text text-transparent">Barbeiro</span></> :
             step === "time" ? <>Horários <span className="bg-gradient-gold bg-clip-text text-transparent">Disponíveis</span></> :
             step === "success" ? <>Agendamento <span className="bg-gradient-gold bg-clip-text text-transparent">Confirmado!</span></> :
             <>Agende seu <span className="bg-gradient-gold bg-clip-text text-transparent">Horário</span></>}
          </h2>
          <p className="text-muted-foreground text-lg">
            {step === "service" ? "Escolha o serviço desejado" :
             step === "barber" ? "Profissionais qualificados" :
             step === "time" ? "Selecione o melhor horário" :
             "Reserve seu momento"}
          </p>
        </div>

        {step === "service" ? (
          <>
            <div className="max-w-md mx-auto mb-6">
              <Input
                placeholder="Pesquisar serviço..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="bg-secondary"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
              {filteredServices.map((service, index) => (
                <Card key={index} className="group cursor-pointer overflow-hidden" onClick={() => handleServiceSelect(service)}>
                  <div className="relative h-24 md:h-56 overflow-hidden">
                    <img src={service.image_url || defaultImages[service.title] || haircutImg} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute bottom-2 left-2">
                      {(() => {
                        const IconComponent = (Icons as any)[service.icon] || Scissors;
                        return <IconComponent className="w-4 h-4 text-primary" />;
                      })()}
                    </div>
                  </div>
                  <CardContent className="p-2 md:p-4">
                    <h3 className="text-xs md:text-base font-bold">{service.title}</h3>
                    <span className="text-sm md:text-xl font-bold text-primary">R$ {service.price.toFixed(2)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : step === "barber" ? (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
              {getAvailableBarbers().map((barber, index) => (
                <Card key={index} className="cursor-pointer overflow-hidden" onClick={() => handleBarberSelect(barber)}>
                  <div className="relative h-48 md:h-56 overflow-hidden">
                    <img src={barber.image_url || defaultBarberImages[index] || barber1Img} alt={barber.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    {barberHasSlotsToday[barber.id] === false && (
                      <div className="absolute top-2 right-2"><span className="px-2 py-1 rounded bg-destructive text-white text-[10px] uppercase">Indisponível hoje</span></div>
                    )}
                  </div>
                  <CardContent className="p-3 text-center">
                    <h3 className="text-sm md:text-lg font-bold">{barber.name}</h3>
                    <p className="text-xs text-primary">{barber.specialty}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center mt-8"><Button variant="outline" onClick={handleBack}>Voltar</Button></div>
          </div>
        ) : step === "time" ? (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2"><Clock className="w-6 h-6 text-primary" />Selecione o Horário</CardTitle>
                <CardDescription>{formData.serviceTitle} com {formData.barberName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" />Data</Label>
                    <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value, time: "" })} min={formatLocalDate(new Date())} className="bg-secondary" />
                  </div>
                  {formData.date && (
                    <div className="space-y-3">
                      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-lg">
                        <p className="text-sm mb-2">Próxima data disponível:</p>
                        <p className="text-xl font-bold text-primary">{new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        {formData.time && <p className="text-3xl font-bold text-primary mt-2">{formData.time}</p>}
                      </div>
                      {hoursLoading ? <p className="text-center">Carregando...</p> : 
                       availableSlots.length === 0 ? <p className="text-center">Nenhum horário disponível</p> :
                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                         {availableSlots.map((time) => (
                           <Button key={time} variant={formData.time === time ? "default" : "outline"} onClick={() => handleTimeSelect(time)}>{time}</Button>
                         ))}
                       </div>}
                    </div>
                  )}
                  <div className="flex justify-center mt-6"><Button variant="outline" onClick={handleBack}>Voltar</Button></div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : step === "success" ? (
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardHeader>
                <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-4" />
                <CardTitle className="text-2xl">Agendamento Confirmado!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-secondary/50 rounded-lg p-6 text-left">
                  <p><strong>Serviço:</strong> {successBooking.serviceTitle} (R$ {successBooking.servicePrice})</p>
                  <p><strong>Barbeiro:</strong> {successBooking.barberName}</p>
                  <p><strong>Data:</strong> {new Date(successBooking.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {successBooking.time}</p>
                </div>
                <Button onClick={() => { setFormData({ name: "", phone: "", service: "", serviceTitle: "", servicePrice: "", barber: "", barberName: "", date: "", time: "" }); setConfirmedBooking(null); setStep("service"); navigate('/cliente'); }} className="w-full">Ir para meu Painel</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader><CardTitle className="text-2xl">Confirmar Agendamento</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6 pb-4 border-b">
                  <p><strong>Serviço:</strong> {formData.serviceTitle}</p>
                  <p><strong>Barbeiro:</strong> {formData.barberName}</p>
                  <p><strong>Data:</strong> {new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {formData.time}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2"><Label>Nome Completo</Label><Input value={formData.name} readOnly className="bg-secondary" /></div>
                  <div className="space-y-2"><Label>Para outra pessoa (Opcional)</Label><Input value={customClientName} onChange={(e) => setCustomClientName(e.target.value)} placeholder="Nome do cliente" /></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={formData.phone} readOnly className="bg-secondary" /></div>
                  <div className="flex gap-4"><Button type="button" variant="outline" onClick={handleBack} className="flex-1">Voltar</Button><Button type="submit" disabled={isSubmitting} className="flex-1">Confirmar</Button></div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Dialog open={unavailableBarberDialogOpen} onOpenChange={setUnavailableBarberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Barbeiro Indisponível Hoje</DialogTitle>
          </DialogHeader>
          <div className="flex gap-3 pt-4"><Button variant="outline" onClick={handleCancelUnavailableBarber} className="flex-1">Outro Barbeiro</Button><Button onClick={handleConfirmUnavailableBarber} className="flex-1">Agendar Futuro</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Booking;
