import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Scissors, Wind, Sparkles, User, Star, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useOperatingHours, getDayKey } from "@/hooks/useOperatingHours";
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

    if (data && !error) {
      // Preservar dados do agendamento: só atualizar se os campos estiverem vazios
      setFormData(prev => {
        // Se já tiver nome e telefone preenchidos, não sobrescrever (pode ser dados do agendamento)
        // Isso preserva os dados quando estiver no step success
        return {
          ...prev,
          name: prev.name || data.name || '',
          phone: prev.phone || data.phone || '',
        };
      });
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
    const { data, error } = await (supabase as any)
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

  const handleBarberSelect = (barber: typeof barbers[0]) => {
    const newFormData = {
      ...formData,
      barber: barber.id,
      barberName: barber.name,
    };
    setFormData(newFormData);
    
    // Ir imediatamente para a etapa de seleção de horário
    setStep("time");

    // Em segundo plano, tentar encontrar automaticamente a próxima data/horário disponível.
    // Qualquer erro aqui é apenas logado e não bloqueia a navegação.
    findNextAvailableDateTime(newFormData).catch((error) => {
      console.error('Error finding next available date/time:', error);
    });
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

          // Slot overlaps with break if: slot_start < break_end AND slot_end > break_start
          return slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes;
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

    // Realtime subscription for appointments changes
    const channel = supabase
      .channel('booking-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          if (formData.date && formData.barber && formData.service) {
            loadAvailableSlots();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [formData.date, formData.barber, formData.service, hoursLoading]);

  const loadAvailableSlots = async () => {
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
  };

  const getAvailableSlotsForDate = async () => {
    if (!formData.date || !formData.barber || !formData.service || hoursLoading) return [];

    const selectedDate = new Date(formData.date + 'T00:00:00');
    
    // Check if barbershop is open on this day
    if (!isDateOpen(selectedDate)) return [];
    
    const dayTimeSlots = getTimeSlotsForDate(selectedDate);

    const { data: appointments } = await (supabase as any)
      .from('appointments')
      .select('appointment_time, service:services(duration)')
      .eq('barber_id', formData.barber)
      .eq('appointment_date', formData.date)
      .neq('status', 'cancelled');

    // Query barber breaks for the selected date
    const { data: breaks, error: breaksError } = await (supabase as any)
      .from('barber_breaks')
      .select('start_time, end_time')
      .eq('barber_id', formData.barber)
      .eq('date', formData.date);
    
    // Ignore 404 errors (table might not exist)
    if (breaksError && breaksError.code !== 'PGRST116') {
      console.warn('Error loading barber breaks:', breaksError);
    }

    const serviceDuration = getServiceDuration(formData.service, services);

    // Check if selected date is today
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    // Get current time in HH:MM format
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

        // Slot overlaps with break if: slot_start < break_end AND slot_end > break_start
        return slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes;
      });
    };

    return dayTimeSlots.filter(slot => {
      // Filter out past times if it's today
      // Use < instead of <= to include the current hour slot if we're still in the first 30 minutes
      if (isToday && slot < currentTime) {
        return false;
      }

      // Filter out slots that overlap with breaks
      if (isSlotInBreak(slot, serviceDuration)) {
        return false;
      }
      
      return !isTimeConflict(slot, serviceDuration, appointments || [], services.find(s => s.id === formData.service));
    });
  };


  const handleTimeSelect = (time: string) => {
    setFormData({
      ...formData,
      time: time,
    });
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Você precisa fazer login para agendar", {
        description: "Redirecionando para a página de login...",
      });
      setTimeout(() => navigate('/auth'), 1500);
      return;
    }

    // Verificar se já existe agendamento no mesmo horário
    const { data: existingAppointment } = await (supabase as any)
      .from('appointments')
      .select('id')
      .eq('barber_id', formData.barber)
      .eq('appointment_date', formData.date)
      .eq('appointment_time', formData.time)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existingAppointment) {
      toast.error("Horário já está ocupado", {
        description: "Por favor, escolha outro horário disponível.",
      });
      return;
    }

    // Verificar se o horário está em uma pausa do barbeiro
    const serviceDuration = getServiceDuration(formData.service, services);
    const { data: breaks, error: breaksError } = await (supabase as any)
      .from('barber_breaks')
      .select('start_time, end_time')
      .eq('barber_id', formData.barber)
      .eq('date', formData.date);
    
    // Ignore 404 errors (table might not exist)
    if (breaksError && breaksError.code !== 'PGRST116') {
      console.warn('Error loading barber breaks:', breaksError);
    }

    if (breaks && breaks.length > 0) {
      const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const slotStartMinutes = timeToMinutes(formData.time);
      const slotEndMinutes = slotStartMinutes + serviceDuration;

      const isInBreak = breaks.some((breakItem: any) => {
        const breakStartMinutes = timeToMinutes(breakItem.start_time);
        const breakEndMinutes = timeToMinutes(breakItem.end_time);

        // Slot overlaps with break if: slot_start < break_end AND slot_end > break_start
        return slotStartMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes;
      });

      if (isInBreak) {
        toast.error("Horário indisponível", {
          description: "Este horário está em uma pausa do barbeiro. Por favor, escolha outro horário.",
        });
        return;
      }
    }

    // Ensure profile exists before creating appointment
    const { data: existingProfile } = await (supabase as any)
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .insert([{
          id: user.id,
          name: formData.name || user.user_metadata?.name || '',
          phone: formData.phone || user.user_metadata?.phone || '',
        }]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    const { data: newAppointment, error } = await (supabase as any)
      .from('appointments')
      .insert([{
        client_id: user.id,
        service_id: formData.service,
        barber_id: formData.barber,
        appointment_date: formData.date,
        appointment_time: formData.time,
        status: 'confirmed',
        booking_type: 'online', // Mark as online booking - WILL trigger webhook
      }])
      .select('id')
      .single();

    if (error) {
      toast.error("Erro ao criar agendamento", {
        description: error.message,
      });
    } else {
      toast.success("Agendamento realizado com sucesso!", {
        description: "Você pode acompanhar no seu painel.",
      });

      // NOTE: Removed direct WhatsApp notification to barber
      // All notifications are now handled by the external webhook system

      // Notify external webhook for UI-created appointments
      try {
        const selectedService = services.find(s => s.id === formData.service);
        const duration = selectedService?.duration || 30;
        const startDateTime = new Date(`${formData.date}T${formData.time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

        await supabase.functions.invoke('api', {
          body: {
            action: 'notify-webhook',
            appointmentId: newAppointment.id,
            clientName: formData.name,
            phone: formData.phone,
            service: selectedService?.title || 'Serviço',
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            userId: user.id,
            notes: null,
          }
        });
        console.log('External webhook notification sent');
      } catch (webhookError) {
        console.error('Error notifying external webhook:', webhookError);
        // Don't block - appointment was already created
      }

      // Disparar processamento da fila de WhatsApp (cliente + barbeiro)
      // Fazer isso de forma assíncrona para não bloquear a UI
      (async () => {
        try {
          // Obter o token de autenticação do usuário
          const { data: { session } } = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          if (!supabaseUrl) {
            console.error('VITE_SUPABASE_URL não configurado');
            return;
          }

          // Fazer chamada direta via fetch com o token do usuário
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
            const errorData = await response.json().catch(() => ({}));
            console.error('Error triggering WhatsApp queue:', response.status, errorData);
          } else {
            const data = await response.json().catch(() => ({}));
            console.log('WhatsApp queue processed after online booking', data);
          }
        } catch (queueError) {
          console.error('Error triggering WhatsApp queue after booking:', queueError);
          // Não bloquear o fluxo do usuário se a fila falhar
        }
      })();

      // Set success step immediately - não esperar pelo processamento da fila
      setStep("success");
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-gold cursor-pointer"
                onClick={() => handleServiceSelect(service)}
              >
                <div className="relative h-48 md:h-56 lg:h-64 overflow-hidden">
                  <img 
                    src={service.image_url || defaultImages[service.title] || haircutImg} 
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                  <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4">
                  <div className="flex items-start gap-1 md:gap-2 mb-1 md:mb-2">
                      {(() => {
                        const IconComponent = (Icons as any)[service.icon] || Scissors;
                        return <IconComponent className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary mt-0.5 flex-shrink-0" />;
                      })()}
                      <h3 className="text-xs md:text-base lg:text-2xl font-bold text-foreground break-words">{service.title}</h3>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-3 md:p-4 lg:p-6">
                  <h3 className="text-xs md:text-base lg:text-2xl font-bold mb-1 md:mb-2 break-words">{service.title}</h3>
                  <p className="text-xs md:text-sm lg:text-base text-muted-foreground mb-2 md:mb-4 line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm md:text-xl lg:text-3xl font-bold text-primary">R$ {service.price.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : step === "barber" ? (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
              {getAvailableBarbers().map((barber, index) => (
                <Card 
                  key={index} 
                  className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-gold cursor-pointer"
                  onClick={() => handleBarberSelect(barber)}
                >
                  <div className="relative h-32 md:h-48 lg:h-64 overflow-hidden">
                    <img 
                      src={barber.image_url || defaultBarberImages[index] || barber1Img} 
                      alt={barber.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                  </div>
                  
                  <CardContent className="p-3 md:p-4 lg:p-6">
                    <h3 className="text-sm md:text-lg lg:text-2xl font-bold text-foreground mb-1 md:mb-2 line-clamp-1">{barber.name}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3 line-clamp-1">{barber.specialty}</p>
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="text-muted-foreground line-clamp-1 hidden md:inline">{barber.experience}</span>
                      <div className="flex items-center gap-1 text-primary ml-auto">
                        <Star className="w-3 h-3 md:w-4 md:h-4 fill-current" />
                        <span className="font-semibold text-xs md:text-sm">{Number(barber.rating).toFixed(1)}</span>
                      </div>
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
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Clock className="w-6 h-6 text-primary" />
                  Selecione o Horário
                </CardTitle>
                <CardDescription>
                  {formData.serviceTitle} com {formData.barberName}
                </CardDescription>
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
                      onChange={async (e) => {
                        const newDate = e.target.value;
                        // Update date and clear time so it will be auto-selected
                        setFormData({ ...formData, date: newDate, time: "" });
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
                      {availableSlots.length === 0 ? (
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
                              onClick={() => handleTimeSelect(time)}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Carregando próxima data disponível...
                    </p>
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
                <div className="space-y-1 mb-6 pb-4 border-b border-border">
                  <p className="text-base"><strong>Serviço:</strong> {formData.serviceTitle} (R$ {formData.servicePrice})</p>
                  <p className="text-base"><strong>Barbeiro:</strong> {formData.barberName}</p>
                  <p className="text-base"><strong>Data e Horário:</strong> {new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {formData.time}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-secondary border-border focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="bg-secondary border-border focus:border-primary transition-colors"
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
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-gold transition-all duration-300 hover:scale-105"
                    >
                      Confirmar Agendamento
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};

export default Booking;
