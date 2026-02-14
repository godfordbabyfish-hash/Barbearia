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

const isTimeConflict = (newTime: string, duration: number, existingAppointments: any[], selectedService: any) => {
  const newEndTime = addMinutesToTime(newTime, duration);
  
  return existingAppointments.some(apt => {
    const aptDuration = apt.service?.duration || 30;
    const aptEndTime = addMinutesToTime(apt.appointment_time, aptDuration);
    
    // Check if times overlap
    return (newTime < aptEndTime && newEndTime > apt.appointment_time);
  });
};

const Booking = () => {
  const { user } = useAuth();
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
        const isSlotInBreak = (slotTime: string, slotDuration: number): boolean => {
          if (!breaks || breaks.length === 0) return false;
          const timeToMinutes = (time: string): number => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
          };
          const slotStartMinutes = timeToMinutes(slotTime);
          const slotEndMinutes = slotStartMinutes + slotDuration;
          return breaks.some((br: any) => {
            const breakStartMinutes = timeToMinutes(br.start_time);
            const breakEndMinutes = timeToMinutes(br.end_time);
            if (slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) return true;
            if (slotStartMinutes === breakEndMinutes) return true;
            return false;
          });
        };
        const availableTodaySlots = timeSlots.filter((slot) => {
          if (slot < currentTime) return false;
          if (isSlotInBreak(slot, serviceDuration)) return false;
          const hasConflict = isTimeConflict(slot, serviceDuration, appointments || [], services.find(s => s.id === formData.service));
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

      // Helper function to check if a slot overlaps with a break
      const isSlotInBreak = (slotTime: string, slotDuration: number): boolean => {
        if (!breaks || breaks.length === 0) return false;

        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const slotStartMinutes = timeToMinutes(slotTime);
        const slotEndMinutes = slotStartMinutes + slotDuration;

        return breaks.some((breakItem: any) => {
          const breakStartMinutes = timeToMinutes(breakItem.start_time);
          const breakEndMinutes = timeToMinutes(breakItem.end_time);
          // 1) Sobreposição padrão
          if (slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) return true;
          // 2) Bloquear slot que inicia exatamente no fim da pausa
          if (slotStartMinutes === breakEndMinutes) return true;
          return false;
        });
      };

      // Verificar se há horários disponíveis hoje
      const availableTodaySlots = todayTimeSlots.filter(slot => {
        // Filtrar horários passados
        if (slot < currentTime) {
          return false;
        }

        // Filtrar horários em pausa
        if (isSlotInBreak(slot, serviceDuration)) {
          return false;
        }

        // Verificar conflitos com agendamentos existentes
        const hasConflict = isTimeConflict(slot, serviceDuration, appointments || [], services.find(s => s.id === formData.service));
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
      const dayName = checkDate.toLocaleDateString('pt-BR', { weekday: 'long' });
      
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
      
      // Ignore 404/table not found errors (table might not exist)
      if (breaksError && breaksError.code !== 'PGRST116' && breaksError.code !== 'PGRST205' && breaksError.code !== '42P01') {
        console.warn('Error loading barber breaks:', breaksError);
      }

      const serviceDuration = getServiceDuration(currentFormData.service, services);
      
      // Filter out past times if it's today
      const isToday = checkDate.toDateString() === today.toDateString();
      const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      
      // Helper function to check if a slot overlaps with a break
      const isSlotInBreak = (slotTime: string, slotDuration: number): boolean => {
        if (!breaks || breaks.length === 0) return false;

        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const slotStartMinutes = timeToMinutes(slotTime);
        const slotEndMinutes = slotStartMinutes + slotDuration;

        return breaks.some((breakItem: any) => {
          const breakStartMinutes = timeToMinutes(breakItem.start_time);
          const breakEndMinutes = timeToMinutes(breakItem.end_time);

          // 1) Sobreposição padrão
          if (slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) return true;
          // 2) Bloquear slot que inicia exatamente no fim da pausa
          if (slotStartMinutes === breakEndMinutes) return true;
          return false;
        });
      };
      
      const availableSlots = dayTimeSlots.filter(slot => {
        // Use < instead of <= to include the current hour if we're still in the first 30 minutes
        // For example, if current time is 09:15, 09:30 should still be available
        if (isToday && slot < currentTime) {
          return false;
        }

        // Filter out slots that overlap with breaks
        if (isSlotInBreak(slot, serviceDuration)) {
          return false;
        }

        const hasConflict = isTimeConflict(slot, serviceDuration, appointments || [], services.find(s => s.id === currentFormData.service));
        if (hasConflict) {
          return false;
        }
        return true;
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
    if (formData.date && formData.barber && formData.service && !hoursLoading) {
      loadAvailableSlots();
    }

    // Realtime subscription for appointments changes (apenas quando necessário)
    let channel: any = null;
    if (formData.date && formData.barber && formData.service && !hoursLoading) {
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
            // Debounce para evitar muitas atualizações
            const timeoutId = setTimeout(() => {
              if (formData.date && formData.barber && formData.service) {
                loadAvailableSlots();
              }
            }, 500);
            return () => clearTimeout(timeoutId);
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [formData.date, formData.barber, formData.service, hoursLoading]);

  const loadAvailableSlots = async () => {
    if (loadingSlots) return; // Prevenir múltiplas chamadas simultâneas
    setLoadingSlots(true);
    try {
      const slots = await getAvailableSlotsForDate();
      setAvailableSlots(slots);
      
      // Auto-select first available time (always update to next available)
      if (slots.length > 0) {
        // Check if current selected time is still available in new slots
        const currentTimeStillAvailable = formData.time && slots.includes(formData.time);
        
        // Only update if current time is not available or no time is selected
        if (!currentTimeStillAvailable) {
          setFormData(prev => ({
            ...prev,
            time: slots[0],
          }));
        }
      } else {
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
      
      // Respeitar disponibilidade diária do barbeiro (dias fechados)
      const selectedBarber = barbers.find(b => b.id === formData.barber);
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
        } catch (err) {
          console.error('Error parsing barber availability (getAvailableSlotsForDate):', err);
        }
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
      
      // Atualizar estado para exibir faixa de pausas
      setSelectedDateBreaks(breaks || []);
    
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
      { filterPastSlots: true, breaks: breaks || [] }
    );
    // Ajustar pelos conflitos do serviço selecionado (duração)
    const serviceDuration = getServiceDuration(formData.service, services);
    return baseSlots.filter(slot =>
      !isTimeConflict(slot, serviceDuration, appointments || [], services.find(s => s.id === formData.service))
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
      try {
        const selectedDate = new Date(formData.date + 'T00:00:00');
        const selectedBarber = barbers.find(b => b.id === formData.barber);
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
        }
      } catch (err) {
        console.warn('Falha ao validar disponibilidade diária do barbeiro:', err);
      }
      
      // 1. Verificações rápidas em paralelo
      const [existingAppointmentResult, breaksResult] = await Promise.allSettled([
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
          : Promise.resolve({ data: [] })
      ]);

      // Verificar conflito de horário
      if (existingAppointmentResult.status === 'fulfilled' && existingAppointmentResult.value.data) {
        toast.error("Horário já está ocupado", {
          description: "Por favor, escolha outro horário disponível.",
        });
        return;
      }

      // Verificar pausas do barbeiro
      if (breaksResult.status === 'fulfilled' && breaksResult.value.data?.length > 0) {
        const serviceDuration = getServiceDuration(formData.service, services);
        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const slotStartMinutes = timeToMinutes(formData.time);
        const slotEndMinutes = slotStartMinutes + serviceDuration;

        const isInBreak = breaksResult.value.data.some((breakItem: any) => {
          const breakStartMinutes = timeToMinutes(breakItem.start_time);
          const breakEndMinutes = timeToMinutes(breakItem.end_time);
          return slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes;
        });

        if (isInBreak) {
          toast.error("Horário indisponível", {
            description: "Este horário está em uma pausa do barbeiro. Por favor, escolha outro horário.",
          });
          return;
        }
      }

      // 2. Criar perfil se necessário (otimizado)
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

      // 3. Criar agendamento
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
          description: error.message || "Falha na requisição. Verifique a configuração do Supabase.",
        });
        return;
      }

      // 4. Sucesso imediato - não esperar notificações
      toast.success("Agendamento realizado com sucesso!", {
        description: "Você pode acompanhar no seu painel.",
      });
      
      setStep("success");

      // 5. Processar notificações de forma assíncrona (não bloquear UI)
      processNotificationsAsync(newAppointment.id, formData, services, user);

    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      toast.error("Erro ao processar agendamento", {
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função assíncrona para processar notificações sem bloquear a UI
  const processNotificationsAsync = async (appointmentId: string, formData: any, services: any[], user: any) => {
    try {
      const selectedService = services.find(s => s.id === formData.service);
      const duration = selectedService?.duration || 30;
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      // Processar webhook e WhatsApp em paralelo com timeouts
      const [webhookResult, whatsappResult] = await Promise.allSettled([
        // Webhook externo (com timeout reduzido)
        Promise.race([
          supabase.functions.invoke('api', {
            body: {
              action: 'notify-webhook',
              appointmentId,
              clientName: customClientName || formData.name,
              phone: formData.phone,
              service: selectedService?.title || 'Serviço',
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              userId: user.id,
              notes: null,
            }
          }),
          // Timeout de 8 segundos para webhook
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Webhook timeout')), 8000)
          )
        ]),

        // WhatsApp queue (com timeout reduzido)
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
              const data = await response.json().catch(() => ({}));
              console.log('✅ WhatsApp queue processed', data);
            }
          })(),
          // Timeout de 6 segundos para WhatsApp
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
      console.warn('⚠️ Background notifications failed:', error);
      // Não mostrar erro para o usuário - agendamento já foi criado com sucesso
    }
  };

  const handleBack = () => {
    if (step === "barber") {
      setStep("service");
    } else if (step === "time") {
      setStep("barber");
    } else if (step === "form") {
      setStep("time");
    }
  };

  return (
    <section id="agendamento" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {step === "service" ? (
              <>
                Selecione o <span className="bg-gradient-gold bg-clip-text text-transparent">Serviço</span>
              </>
            ) : step === "barber" ? (
              <>
                Escolha seu <span className="bg-gradient-gold bg-clip-text text-transparent">Barbeiro</span>
              </>
            ) : step === "time" ? (
              <>
                Horários <span className="bg-gradient-gold bg-clip-text text-transparent">Disponíveis</span>
              </>
            ) : step === "success" ? (
              <>
                Agendamento <span className="bg-gradient-gold bg-clip-text text-transparent">Confirmado!</span>
              </>
            ) : (
              <>
                Agende seu <span className="bg-gradient-gold bg-clip-text text-transparent">Horário</span>
              </>
            )}
          </h2>
          <p className="text-muted-foreground text-lg">
            {step === "service" 
              ? "Escolha o serviço desejado para iniciar seu agendamento"
              : step === "barber"
              ? "Profissionais qualificados e experientes"
              : step === "time"
              ? "Selecione o melhor horário para você"
              : step === "success"
              ? "Reserve seu momento de cuidado pessoal"
              : "Reserve seu momento de cuidado pessoal"
            }
          </p>
        </div>

        {step === "service" ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-gold cursor-pointer"
                onClick={() => handleServiceSelect(service)}
              >
                <div className="relative h-24 md:h-56 lg:h-64 overflow-hidden">
                  <img 
                    src={service.image_url || defaultImages[service.title] || haircutImg} 
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                  <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4">
                    {(() => {
                      const IconComponent = (Icons as any)[service.icon] || Scissors;
                      return <IconComponent className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary" />;
                    })()}
                  </div>
                </div>
                
                <CardContent className="p-2 md:p-4 lg:p-6">
                  <h3 className="text-xs md:text-base lg:text-2xl font-bold mb-1 md:mb-2 break-words whitespace-normal leading-tight">{service.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-xl lg:text-3xl font-bold text-primary">R$ {service.price.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : step === "barber" ? (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
              {getAvailableBarbers().map((barber, index) => (
                <Card 
                  key={index} 
                  className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-gold cursor-pointer"
                  onClick={() => handleBarberSelect(barber)}
                >
                  <div className="relative h-48 md:h-56 lg:h-64 overflow-hidden">
                    <img 
                      src={barber.image_url || defaultBarberImages[index] || barber1Img} 
                      alt={barber.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                    {barberHasSlotsToday[barber.id] === false && (
                      <div className="absolute top-2 right-2 md:top-3 md:right-3">
                        <span className="px-2 py-1 md:px-3 md:py-1.5 rounded bg-destructive/80 text-destructive-foreground text-[10px] md:text-xs font-bold tracking-wide uppercase">
                          Indisponível hoje
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-3 md:p-6 lg:p-8 text-center">
                    <h3 className="text-sm md:text-lg lg:text-2xl font-bold mb-1 md:mb-2 line-clamp-1">{barber.name}</h3>
                    <p className="text-xs md:text-sm lg:text-base text-primary font-semibold mb-1 md:mb-2 line-clamp-1">{barber.specialty}</p>
                    
                    <div className="flex items-center justify-center gap-0.5 md:gap-1">
                      {[...Array(Math.floor(Number(barber.rating)))].map((_, i) => (
                        <Star key={i} className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 fill-primary text-primary" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Button 
                variant="outline"
                onClick={handleBack}
                className="min-w-[200px]"
              >
                Voltar
              </Button>
            </div>
          </div>
        ) : step === "time" ? (
          <div className="max-w-4xl mx-auto">
            <Card className="bg-card border-border shadow-elegant">
              <CardHeader>
                <div className="flex items-start gap-4">
                  {(() => {
                    const selectedBarber = barbers.find(b => b.id === formData.barber);
                    const barberIndex = barbers.findIndex(b => b.id === formData.barber);
                    const barberImage = selectedBarber?.image_url || defaultBarberImages[barberIndex] || barber1Img;
                    
                    return (
                      <div className="flex-shrink-0">
                        <img
                          src={barberImage}
                          alt={formData.barberName}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary/50 shadow-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = barber1Img;
                          }}
                        />
                      </div>
                    );
                  })()}
                  <div className="flex-1">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Clock className="w-6 h-6 text-primary" />
                      Selecione o Horário
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {formData.serviceTitle} com {formData.barberName}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Data
                    </Label>
                      <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => {
                        try {
                          const newDate = e.target.value;
                          // Update date and clear time so it will be auto-selected
                          setFormData({ ...formData, date: newDate, time: "" });
                        } catch (error) {
                          console.error('Error changing date:', error);
                        }
                      }}
                      required
                      min={formatLocalDate(new Date())}
                      className="bg-secondary border-border focus:border-primary transition-colors"
                    />
                  </div>

                  {formData.date ? (
                    <div className="space-y-3">
                      <Label>Horários Disponíveis</Label>
                      <div className="mb-4 p-6 bg-primary/10 border-2 border-primary/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Próxima data disponível:</p>
                        <p className="text-xl font-bold text-primary mb-3">
                          {new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        {availableSlots.length > 0 && formData.time && (
                          <>
                            <p className="text-sm text-muted-foreground mb-1">Horário selecionado:</p>
                            <p className="text-3xl font-bold text-primary">{formData.time}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              (Selecionado automaticamente - você pode escolher outro horário abaixo)
                            </p>
                          </>
                        )}
                      </div>
                      {(() => {
                        try {
                          const selectedBarber = barbers.find(b => b.id === formData.barber);
                          if (selectedBarber?.availability) {
                            const availability = typeof selectedBarber.availability === 'string'
                              ? JSON.parse(selectedBarber.availability)
                              : selectedBarber.availability;
                            const dayKey = getDayKey(new Date(formData.date + 'T00:00:00'));
                            if (availability?.[dayKey]?.closed) {
                              return (
                                <div className="mb-3 p-4 rounded-lg border-2 border-destructive/30 bg-destructive/10">
                                  <p className="text-sm font-semibold text-destructive">
                                    Barbeiro indisponível nesta data.
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Escolha outra data ou outro barbeiro.
                                  </p>
                                </div>
                              );
                            }
                          }
                        } catch (e) {
                          // ignore parse errors
                        }
                        return null;
                      })()}
                      {selectedDateBreaks.length > 0 && (
                        <div className="mb-3 p-4 rounded-lg border border-border bg-secondary/30">
                          <p className="text-sm font-semibold mb-2">Pausas deste dia</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDateBreaks.map((br, idx) => (
                              <span key={`${br.start_time}-${br.end_time}-${idx}`} className="px-2 py-1 text-xs rounded-full bg-muted text-foreground border border-border">
                                {br.start_time.slice(0,5)}–{br.end_time.slice(0,5)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {hoursLoading ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">Carregando horários disponíveis...</p>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum horário disponível para esta data. Tente outra data.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {availableSlots.map((time) => (
                            <Button
                              key={time}
                              type="button"
                              variant={formData.time === time ? "default" : "outline"}
                              className={formData.time === time
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-2 border-primary" 
                                : "hover:bg-primary hover:text-primary-foreground transition-all"
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTimeSelect(time);
                              }}
                              disabled={hoursLoading}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Carregando próxima data disponível...</p>
                    </div>
                  )}

                  <div className="flex justify-center mt-6">
                    <Button 
                      variant="outline"
                      onClick={handleBack}
                      className="min-w-[200px]"
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : step === "success" ? (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-card border-border shadow-elegant">
              <CardHeader>
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-primary" />
                  </div>
                  <CardTitle className="text-2xl text-center">Agendamento Confirmado!</CardTitle>
                  <CardDescription className="text-center text-base">
                    Seu agendamento foi realizado com sucesso.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-secondary/50 rounded-lg p-6 border border-border space-y-4">
                  <div className="space-y-2">
                    <p className="text-base"><strong>Serviço:</strong> {formData.serviceTitle} (R$ {formData.servicePrice})</p>
                    <p className="text-base"><strong>Barbeiro:</strong> {formData.barberName}</p>
                    <p className="text-base"><strong>Data e Horário:</strong> {new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {formData.time}</p>
                  </div>
                </div>

                {barbershopAddress && (
                  <div className="bg-primary/10 rounded-lg p-6 border border-primary/20 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-lg">Localização</h3>
                    </div>
                    <p className="text-muted-foreground mb-3">
                      Encontre-nos no endereço abaixo:
                    </p>
                    <a
                      href={getGoogleMapsLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium text-base group"
                    >
                      <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="underline">{barbershopAddress || 'Ver localização'}</span>
                      <span className="text-xs text-muted-foreground">(Abrir no Maps)</span>
                    </a>
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    onClick={() => {
                      setFormData({ 
                        name: "", 
                        phone: "", 
                        service: "", 
                        serviceTitle: "",
                        servicePrice: "",
                        barber: "",
                        barberName: "",
                        date: "", 
                        time: "" 
                      });
                      setStep("service");
                      navigate('/cliente');
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-gold transition-all duration-300 hover:scale-105"
                  >
                    Ir para meu Painel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-card border-border shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl">Confirmar Agendamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6 pb-4 border-b border-border">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const selectedBarber = barbers.find(b => b.id === formData.barber);
                      const barberIndex = barbers.findIndex(b => b.id === formData.barber);
                      const barberImage = selectedBarber?.image_url || defaultBarberImages[barberIndex] || barber1Img;
                      
                      return (
                        <div className="flex-shrink-0">
                          <img
                            src={barberImage}
                            alt={formData.barberName}
                            className="w-20 h-20 rounded-full object-cover border-2 border-primary/50 shadow-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = barber1Img;
                            }}
                          />
                        </div>
                      );
                    })()}
                    <div className="flex-1 space-y-1">
                      <p className="text-base"><strong>Serviço:</strong> {formData.serviceTitle} (R$ {formData.servicePrice})</p>
                      <p className="text-base"><strong>Barbeiro:</strong> {formData.barberName}</p>
                      <p className="text-base"><strong>Data e Horário:</strong> {new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {formData.time}</p>
                    </div>
                  </div>
                </div>
                {/* Etapa de confirmação: exibir nome e telefone apenas como resumo, sem permitir edição */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo (Responsável)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      readOnly
                      className="bg-secondary border-border text-muted-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customClientName">Agendar para outra pessoa (Opcional)</Label>
                    <Input
                      id="customClientName"
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                      placeholder="Nome de quem vai cortar (deixe vazio se for para você)"
                      className="bg-secondary border-border focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      readOnly
                      className="bg-secondary border-border text-muted-foreground"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !formData.time}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-gold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Processando..." : "Confirmar Agendamento"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal de confirmação para barbeiro indisponível hoje */}
      <Dialog open={unavailableBarberDialogOpen} onOpenChange={setUnavailableBarberDialogOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Barbeiro Indisponível Hoje</DialogTitle>
            <DialogDescription className="text-sm sm:text-base whitespace-normal break-words leading-relaxed">
              {selectedUnavailableBarber && (
                <>
                  O barbeiro <strong>{selectedUnavailableBarber.name}</strong> não possui horários disponíveis para hoje.
                  <br /><br />
                  Deseja agendar com este barbeiro mesmo assim? Você será direcionado para selecionar uma data futura disponível.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancelUnavailableBarber}
              className="flex-1 text-sm sm:text-base"
            >
              Não, escolher outro barbeiro
            </Button>
            <Button
              onClick={handleConfirmUnavailableBarber}
              className="flex-1 bg-primary hover:bg-primary/90 text-sm sm:text-base"
            >
              Sim, agendar mesmo assim
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Booking;
