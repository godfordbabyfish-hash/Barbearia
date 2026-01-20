import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Globe, Clock, Users, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuickBookingDialog } from "@/components/QuickBookingDialog";
import { format, addMinutes } from "date-fns";
import { useOperatingHours } from "@/hooks/useOperatingHours";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  booking_type: string;
  status: string;
  profiles: { name: string; phone: string };
  services: { title: string; duration: number };
  barbers: { name: string };
}

const FilaDaBarbearia = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const navigate = useNavigate();
  const { getTimeSlotsForDate, isDateOpen, loading: hoursLoading } = useOperatingHours();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hoursLoading) {
      loadAppointments();
      calculateAvailableSlots();
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel("appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          loadAppointments();
          calculateAvailableSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hoursLoading]);

  const loadAppointments = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services(title, duration),
        barbers(name)
      `)
      .gte("appointment_date", today)
      .neq("status", "completed")
      .order("appointment_date")
      .order("appointment_time");

    if (error) {
      console.error("Error loading appointments:", error);
      return;
    }

    // Load profiles separately
    if (data && data.length > 0) {
      const clientIds = [...new Set(data.map(apt => apt.client_id))]; // Remove duplicatas
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, phone")
        .in("id", clientIds);

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
      }

      console.log("Loaded profiles:", profiles);
      console.log("Client IDs from appointments:", clientIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const appointmentsWithProfiles = data.map(apt => {
        const profile = profilesMap.get(apt.client_id);
        
        console.log(`Appointment ${apt.id} - client_id: ${apt.client_id}, profile found:`, profile);
        
        // Se encontrou o perfil e tem nome
        if (profile && profile.name && profile.name.trim() !== '') {
          return {
            ...apt,
            profiles: profile
          };
        }
        
        // Se perfil existe mas nome está vazio, tenta buscar do metadata do usuário
        if (profile && (!profile.name || profile.name.trim() === '')) {
          console.warn(`Profile exists but name is empty for client_id: ${apt.client_id}`);
        } else {
          console.warn(`Profile NOT found for client_id: ${apt.client_id}`);
        }
        
        // Fallback: usa nome do perfil mesmo que vazio, ou cria um nome temporário
        const fallbackName = profile?.name?.trim() || `Cliente ${apt.client_id.slice(0, 8)}`;
        
        return {
          ...apt,
          profiles: { 
            name: fallbackName, 
            phone: profile?.phone || ""
          }
        };
      });

      console.log("Appointments with profiles:", appointmentsWithProfiles);
      setAppointments(appointmentsWithProfiles as any);
    } else {
      setAppointments([]);
    }
  };

  const calculateAvailableSlots = async () => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    // Check if barbershop is open today
    if (!isDateOpen(today)) {
      setAvailableSlots([]);
      return;
    }

    // Get all appointments for today
    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_time, services(duration)")
      .eq("appointment_date", todayStr);

    // Get time slots based on operating hours
    const allSlots = getTimeSlotsForDate(today);
    
    // Filter out past time slots
    const slots = allSlots.filter(slot => {
      const [hour, minute] = slot.split(":").map(Number);
      return hour > currentHour || (hour === currentHour && minute > currentMinute);
    });

    // Filter out booked slots
    const bookedSlots = new Set<string>();
    appointments?.forEach((apt) => {
      const startTime = apt.appointment_time;
      const duration = apt.services?.duration || 30;
      
      // Mark the start time and next slots based on duration as booked
      const [hours, minutes] = startTime.split(":").map(Number);
      let currentSlotTime = new Date();
      currentSlotTime.setHours(hours, minutes, 0, 0);
      
      for (let i = 0; i < Math.ceil(duration / 30); i++) {
        const slotStr = format(currentSlotTime, "HH:mm");
        bookedSlots.add(slotStr);
        currentSlotTime = addMinutes(currentSlotTime, 30);
      }
    });

    const available = slots.filter((slot) => !bookedSlots.has(slot));
    setAvailableSlots(available);
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const localAppointments = appointments.filter((apt) => apt.booking_type === "local" && apt.appointment_date === today);
  const onlineAppointments = appointments.filter((apt) => apt.booking_type === "online");

  const inProgressCount = appointments.filter((apt) => apt.status === "in_progress").length;
  const waitingCount = appointments.filter((apt) => apt.status === "confirmed" || apt.status === "pending").length;

  const calculateWaitTime = (index: number) => {
    let totalMinutes = 0;
    for (let i = 0; i < index; i++) {
      totalMinutes += appointments[i]?.services?.duration || 30;
    }
    return totalMinutes;
  };

  const handleSlotClick = (slot: string) => {
    setSelectedSlot(slot);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="text-primary">Barbearia</span>{" "}
              <span className="text-foreground">Raimundos</span>
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-semibold text-sm inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
              AO VIVO
            </span>
            <div className="text-3xl text-primary font-bold tracking-wider">{currentTime}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Available Slots - Card Clicável - Above Stats Cards */}
        <button
          onClick={() => {
            if (availableSlots.length > 0) {
              setQuickBookingOpen(true);
            }
          }}
          disabled={availableSlots.length === 0}
          className="w-full bg-card border-2 border-border p-5 md:p-6 lg:p-7 rounded-xl shadow-lg hover:border-success hover:bg-success/5 hover:shadow-xl transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-card disabled:hover:shadow-lg min-h-[120px] flex items-center"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 bg-success/10 rounded-xl flex-shrink-0">
                <Clock className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="text-primary text-lg md:text-xl lg:text-2xl font-bold mb-1.5 md:mb-2">Horários Disponíveis Hoje</h2>
                {availableSlots.length > 0 ? (
                  <p className="text-muted-foreground text-sm md:text-base">
                    {availableSlots.length} horário{availableSlots.length > 1 ? 's' : ''} disponível{availableSlots.length > 1 ? 'eis' : ''} - Clique para iniciar atendimento local
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm md:text-base">Sem horários disponíveis hoje</p>
                )}
              </div>
            </div>
            {availableSlots.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <div className="flex flex-wrap gap-2">
                  {availableSlots.slice(0, 4).map((slot) => (
                    <span key={slot} className="px-3 py-1.5 md:px-4 md:py-2 bg-success text-success-foreground rounded-full text-xs md:text-sm font-bold shadow-md">
                      {slot}
                    </span>
                  ))}
                  {availableSlots.length > 4 && (
                    <span className="px-3 py-1.5 md:px-4 md:py-2 bg-success/80 text-success-foreground rounded-full text-xs md:text-sm font-bold shadow-md">
                      +{availableSlots.length - 4}
                    </span>
                  )}
                </div>
                <div className="text-success flex-shrink-0">
                  <svg className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
            </div>
          )}
          </div>
        </button>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          <div className="bg-card border border-border p-4 md:p-5 lg:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/50 text-center flex flex-col justify-between min-h-[180px] md:min-h-[200px] lg:min-h-[220px]">
            <div className="flex items-center justify-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wide mb-2 md:mb-3">
              <Users className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary" />
              NA FILA
            </div>
            <div className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-primary font-bold mb-1 md:mb-2 leading-none">{waitingCount}</div>
            <div className="text-muted-foreground text-xs md:text-sm font-medium">local + agendado</div>
          </div>
          <div className="bg-card border border-border p-4 md:p-5 lg:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/50 text-center flex flex-col justify-between min-h-[180px] md:min-h-[200px] lg:min-h-[220px]">
            <div className="flex items-center justify-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wide mb-2 md:mb-3">
              <Scissors className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary" />
              EM ATENDIMENTO
            </div>
            <div className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-primary font-bold mb-1 md:mb-2 leading-none">{inProgressCount}</div>
            <div className="text-muted-foreground text-xs md:text-sm font-medium">barbeiros ocupados</div>
          </div>
          <div className="bg-card border border-border p-4 md:p-5 lg:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/50 text-center flex flex-col justify-between min-h-[180px] md:min-h-[200px] lg:min-h-[220px]">
            <div className="flex items-center justify-center gap-1.5 md:gap-2 text-muted-foreground text-xs md:text-sm font-semibold uppercase tracking-wide mb-2 md:mb-3">
              <Clock className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary" />
              TEMPO MÉDIO
            </div>
            <div className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-primary font-bold mb-1 md:mb-2 leading-none">
              ~{appointments.length > 0 ? Math.round(appointments.reduce((acc, apt) => acc + (apt.services?.duration || 30), 0) / appointments.length) : 30}min
            </div>
            <div className="text-muted-foreground text-xs md:text-sm font-medium">até ser chamado</div>
          </div>
        </div>

        {/* Queues Side by Side */}
        <div className="grid grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        {/* Local Queue */}
        <section className="bg-card border border-border p-2.5 md:p-4 lg:p-6 rounded-xl shadow-lg flex flex-col min-h-[600px] md:min-h-[650px] lg:min-h-[700px]">
          <div className="flex items-center gap-2 md:gap-3 mb-2.5 md:mb-4 pb-2 md:pb-3 border-b border-border">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
            </div>
            <div className="flex-1">
              <h2 className="text-primary text-sm md:text-base lg:text-lg font-bold break-words">Fila Local (No Local)</h2>
              <span className="inline-block bg-success text-success-foreground px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5">
                Tablet Barbearia
              </span>
            </div>
          </div>
          
          {localAppointments.length === 0 ? (
            <div className="text-center py-6 flex-1 flex items-center justify-center">
              <div>
                <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-xs font-medium">Nenhum cliente na fila local</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 flex-1 overflow-y-auto">
              {localAppointments.map((apt, index) => {
                const waitTime = calculateWaitTime(index);
                return (
                  <div key={apt.id} className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2 lg:gap-3 p-1.5 md:p-2 lg:p-3 border-l-3 border-primary bg-secondary/30 hover:bg-secondary/50 rounded-r-lg transition-all duration-200">
                    <div className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                      {index + 1}º
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-primary/20 text-primary text-xs md:text-sm lg:text-base font-bold flex-shrink-0">
                      {apt.profiles.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0">
                      <div className="font-bold text-foreground text-xs md:text-sm lg:text-base break-words leading-tight">{apt.profiles.name}</div>
                      <div className="text-muted-foreground text-xs md:text-sm break-words leading-tight">
                        {apt.services.title} ({apt.services.duration}min) - {apt.barbers.name}
                      </div>
                      <div className="text-primary text-xs md:text-sm font-medium break-words leading-tight">
                        {apt.status === "in_progress"
                          ? "⏳ Agora"
                          : `⏱️ ~${waitTime}min`}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 md:px-2.5 md:py-1 lg:px-3 lg:py-1.5 rounded-full text-xs md:text-sm font-bold uppercase whitespace-nowrap self-start ${
                        apt.status === "in_progress"
                          ? "bg-warning text-warning-foreground"
                          : index === 0
                          ? "bg-success text-success-foreground"
                          : "bg-secondary border border-border text-muted-foreground"
                      }`}
                    >
                      {apt.status === "in_progress"
                        ? "ATEND."
                        : index === 0
                        ? "PRÓX."
                        : "AGUARD."}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Online Queue */}
        <section className="bg-card border border-border p-2.5 md:p-4 lg:p-6 rounded-xl shadow-lg flex flex-col min-h-[600px] md:min-h-[650px] lg:min-h-[700px]">
          <div className="flex items-center gap-2 md:gap-3 mb-2.5 md:mb-4 pb-2 md:pb-3 border-b border-border">
            <div className="p-1.5 bg-info/10 rounded-lg">
              <Globe className="w-4 h-4 md:w-5 md:h-5 text-info flex-shrink-0" />
            </div>
            <div className="flex-1">
              <h2 className="text-primary text-sm md:text-base lg:text-lg font-bold break-words">Fila Agendada (Online)</h2>
              <span className="inline-block bg-info text-info-foreground px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5">
                Clientes Remotos
              </span>
            </div>
          </div>
          
          {onlineAppointments.length === 0 ? (
            <div className="text-center py-6 flex-1 flex items-center justify-center">
              <div>
                <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-xs font-medium">Nenhum agendamento online hoje</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 flex-1 overflow-y-auto">
              {onlineAppointments.map((apt) => {
                const now = new Date();
                const [hours, minutes] = apt.appointment_time.split(":").map(Number);
                const appointmentTime = new Date();
                appointmentTime.setHours(hours, minutes, 0, 0);
                const minutesUntil = Math.round((appointmentTime.getTime() - now.getTime()) / 60000);

                const isToday = apt.appointment_date === today;
                const formattedDate = format(new Date(apt.appointment_date + "T12:00:00"), "dd/MM");

                return (
                  <div key={apt.id} className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2 lg:gap-3 p-1.5 md:p-2 lg:p-3 border-l-3 border-info bg-secondary/30 hover:bg-secondary/50 rounded-r-lg transition-all duration-200">
                    <div className="flex items-center justify-center min-w-[55px] md:min-w-[70px] lg:min-w-[80px] p-1 md:p-1.5 rounded-lg bg-info/10 flex-shrink-0">
                      <div className="text-xs md:text-sm font-bold text-info leading-tight text-center">
                        {formattedDate}<br className="hidden md:block" />
                        <span className="text-xs">{apt.appointment_time.slice(0, 5)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-info/20 text-info text-xs md:text-sm lg:text-base font-bold flex-shrink-0">
                      {apt.profiles.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0">
                      <div className="font-bold text-foreground text-xs md:text-sm lg:text-base break-words leading-tight">{apt.profiles.name}</div>
                      <div className="text-muted-foreground text-xs md:text-sm break-words leading-tight">
                        {apt.services.title} ({apt.services.duration}min) - {apt.barbers.name}
                      </div>
                      {isToday && minutesUntil > 0 && (
                        <div className="text-primary text-xs md:text-sm font-medium break-words leading-tight">
                          ⏱️ ~{minutesUntil}min
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </div>

        <QuickBookingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          timeSlot={selectedSlot}
          date={format(new Date(), "yyyy-MM-dd")}
        />

        {/* Quick Booking for Local Service - opens when clicking the Available Slots card */}
        {quickBookingOpen && availableSlots.length > 0 && (
          <QuickBookingDialog
            open={quickBookingOpen}
            onOpenChange={setQuickBookingOpen}
            timeSlot={availableSlots[0]}
            date={format(new Date(), "yyyy-MM-dd")}
          />
        )}

        {/* How it works */}
        <section className="bg-card border border-border p-5 md:p-6 lg:p-7 rounded-xl shadow-lg">
          <h2 className="text-primary text-lg md:text-xl lg:text-2xl font-bold mb-5 md:mb-6 pb-3 md:pb-4 border-b border-border">Como Funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            <div className="p-4 md:p-5 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors flex flex-col min-h-[140px]">
              <div className="flex items-center gap-2 md:gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <strong className="text-primary text-sm md:text-base font-bold">Clientes Locais</strong>
              </div>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed flex-1">
                Esperam fisicamente na barbearia e são atendidos na ordem de chegada.
              </p>
            </div>
            <div className="p-4 md:p-5 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors flex flex-col min-h-[140px]">
              <div className="flex items-center gap-2 md:gap-3 mb-3">
                <div className="p-2 bg-info/10 rounded-lg flex-shrink-0">
                  <Globe className="w-4 h-4 md:w-5 md:h-5 text-info" />
                </div>
                <strong className="text-primary text-sm md:text-base font-bold">Clientes Agendados</strong>
              </div>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed flex-1">
                Chegam no horário agendado sem conflitos e com prioridade garantida.
              </p>
            </div>
            <div className="p-4 md:p-5 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors flex flex-col min-h-[140px]">
              <div className="flex items-center gap-2 md:gap-3 mb-3">
                <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
                  <Scissors className="w-4 h-4 md:w-5 md:h-5 text-success" />
                </div>
                <strong className="text-primary text-sm md:text-base font-bold">Garantia</strong>
              </div>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed flex-1">
                Múltiplos barbeiros trabalham em paralelo para máxima eficiência!
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FilaDaBarbearia;