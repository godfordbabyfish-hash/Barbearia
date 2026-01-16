import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Scissors, Wind, Sparkles, User, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useOperatingHours } from "@/hooks/useOperatingHours";
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
  const [step, setStep] = useState<"service" | "barber" | "time" | "form">("service");
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
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

  useEffect(() => {
    loadServices();
    loadBarbers();
    loadUserProfile();
    
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
  }, [user, location]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('name, phone')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      setFormData(prev => ({
        ...prev,
        name: data.name || '',
        phone: data.phone || '',
      }));
    }
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
    const newFormData = {
      ...formData,
      barber: barber.id,
      barberName: barber.name,
    };
    setFormData(newFormData);
    
    // Find next available date and time
    await findNextAvailableDateTime(newFormData);
    setStep("time");
  };

  const findNextAvailableDateTime = async (currentFormData: typeof formData) => {
    if (!currentFormData.service || !currentFormData.barber || hoursLoading) return;

    const today = new Date();
    const maxDaysToCheck = 30; // Check next 30 days
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:187',message:'FindNextAvailableDateTime start',data:{todayDate:today.toISOString().split('T')[0],service:currentFormData.service,barber:currentFormData.barber},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    for (let i = 0; i < maxDaysToCheck; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayName = checkDate.toLocaleDateString('pt-BR', { weekday: 'long' });
      
      // Check if date is open
      const dateIsOpen = isDateOpen(checkDate);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:199',message:'Checking date',data:{dayOffset:i,dateStr,dayName,dateIsOpen},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      
      // Skip closed days
      if (!dateIsOpen) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:204',message:'Date is closed, skipping',data:{dateStr,dayName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        continue;
      }
      
      const dayTimeSlots = getTimeSlotsForDate(checkDate);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:210',message:'Day time slots generated',data:{dateStr,totalSlots:dayTimeSlots.length,slots:dayTimeSlots.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      
      const { data: appointments } = await (supabase as any)
        .from('appointments')
        .select('appointment_time, service:services(duration)')
        .eq('barber_id', currentFormData.barber)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      const serviceDuration = getServiceDuration(currentFormData.service, services);
      
      // Filter out past times if it's today
      const isToday = checkDate.toDateString() === today.toDateString();
      const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      
      const availableSlots = dayTimeSlots.filter(slot => {
        if (isToday && slot <= currentTime) return false;
        return !isTimeConflict(slot, serviceDuration, appointments || [], services.find(s => s.id === currentFormData.service));
      });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:228',message:'Available slots calculated',data:{dateStr,totalSlots:dayTimeSlots.length,availableCount:availableSlots.length,availableSlots:availableSlots.slice(0,5),appointmentsCount:appointments?.length || 0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
      // #endregion

      if (availableSlots.length > 0) {
        // Found a date with available slots
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:234',message:'Found first available date',data:{selectedDate:dateStr,selectedTime:availableSlots[0],totalAvailable:availableSlots.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
        // #endregion
        
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:246',message:'No available slots found in 30 days',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:265',message:'LoadAvailableSlots start',data:{date:formData.date,barber:formData.barber,service:formData.service,currentTime:formData.time},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    const slots = await getAvailableSlotsForDate();
    setAvailableSlots(slots);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:272',message:'LoadAvailableSlots result',data:{slotsCount:slots.length,firstSlot:slots[0],currentTime:formData.time},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    // Auto-select first available time (always update to next available)
    if (slots.length > 0) {
      // Check if current selected time is still available in new slots
      const currentTimeStillAvailable = formData.time && slots.includes(formData.time);
      
      // Only update if current time is not available or no time is selected
      if (!currentTimeStillAvailable) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:280',message:'Auto-selecting first available slot',data:{newTime:slots[0],oldTime:formData.time,reason:!currentTimeStillAvailable?'time_not_available':'no_time_selected'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
        // #endregion
        
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

    const serviceDuration = getServiceDuration(formData.service, services);

    // Check if selected date is today
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    // Get current time in HH:MM format
    const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    return dayTimeSlots.filter(slot => {
      // Filter out past times if it's today
      if (isToday && slot <= currentTime) {
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
      
      // Redirect to client dashboard after 2 seconds
      setTimeout(() => navigate('/cliente'), 2000);
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
                Nossos <span className="bg-gradient-gold bg-clip-text text-transparent">Serviços</span>
              </>
            ) : step === "barber" ? (
              <>
                Escolha seu <span className="bg-gradient-gold bg-clip-text text-transparent">Barbeiro</span>
              </>
            ) : step === "time" ? (
              <>
                Horários <span className="bg-gradient-gold bg-clip-text text-transparent">Disponíveis</span>
              </>
            ) : (
              <>
                Agende seu <span className="bg-gradient-gold bg-clip-text text-transparent">Horário</span>
              </>
            )}
          </h2>
          <p className="text-muted-foreground text-lg">
            {step === "service" 
              ? "Experiência premium em cada serviço"
              : step === "barber"
              ? "Profissionais qualificados e experientes"
              : step === "time"
              ? "Selecione o melhor horário para você"
              : "Reserve seu momento de cuidado pessoal"
            }
          </p>
        </div>

        {step === "service" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-gold cursor-pointer"
                onClick={() => handleServiceSelect(service)}
              >
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={service.image_url || defaultImages[service.title] || haircutImg} 
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const IconComponent = (Icons as any)[service.icon] || Scissors;
                        return <IconComponent className="w-5 h-5 text-primary" />;
                      })()}
                      <h3 className="text-2xl font-bold text-foreground">{service.title}</h3>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-primary">R$ {service.price.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : step === "barber" ? (
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {barbers.map((barber, index) => (
                <Card 
                  key={index} 
                  className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-gold cursor-pointer"
                  onClick={() => handleBarberSelect(barber)}
                >
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={barber.image_url || defaultBarberImages[index] || barber1Img} 
                      alt={barber.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-bold text-foreground mb-2">{barber.name}</h3>
                    <p className="text-muted-foreground mb-3">{barber.specialty}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{barber.experience}</span>
                      <div className="flex items-center gap-1 text-primary">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold">{Number(barber.rating).toFixed(1)}</span>
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
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Booking.tsx:588',message:'Date changed manually',data:{oldDate:formData.date,newDate},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
                        // #endregion
                        
                        // Update date and clear time so it will be auto-selected
                        setFormData({ ...formData, date: newDate, time: "" });
                      }}
                      required
                      min={new Date().toISOString().split('T')[0]}
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
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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
        ) : (
          <div className="max-w-2xl mx-auto">
            <Card className="bg-card border-border shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl">Confirmar Agendamento</CardTitle>
                <CardDescription>
                  <div className="space-y-1 mt-2">
                    <p className="text-base"><strong>Serviço:</strong> {formData.serviceTitle} (R$ {formData.servicePrice})</p>
                    <p className="text-base"><strong>Barbeiro:</strong> {formData.barberName}</p>
                    <p className="text-base"><strong>Data e Horário:</strong> {new Date(formData.date + 'T00:00:00').toLocaleDateString('pt-BR')} às {formData.time}</p>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
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
