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
      const clientIds = data.map(apt => apt.client_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, phone")
        .in("id", clientIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const appointmentsWithProfiles = data.map(apt => ({
        ...apt,
        profiles: profilesMap.get(apt.client_id) || { name: "Cliente", phone: "" }
      }));

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
              <span className="text-primary">Raimundos</span>{" "}
              <span className="text-foreground">Barbershop</span>
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-medium mb-2">
              <Users className="w-4 h-4" />
              NA FILA
            </div>
            <div className="text-5xl text-primary font-bold mb-1">{waitingCount}</div>
            <div className="text-muted-foreground text-sm">local + agendado</div>
          </div>
          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-medium mb-2">
              <Scissors className="w-4 h-4" />
              EM ATENDIMENTO
            </div>
            <div className="text-5xl text-primary font-bold mb-1">{inProgressCount}</div>
            <div className="text-muted-foreground text-sm">barbeiros ocupados</div>
          </div>
          <div className="bg-card border border-border p-6 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-medium mb-2">
              <Clock className="w-4 h-4" />
              TEMPO MÉDIO
            </div>
            <div className="text-5xl text-primary font-bold mb-1">
              ~{appointments.length > 0 ? Math.round(appointments.reduce((acc, apt) => acc + (apt.services?.duration || 30), 0) / appointments.length) : 30}min
            </div>
            <div className="text-muted-foreground text-sm">até ser chamado</div>
          </div>
        </div>

        {/* Local Queue */}
        <section className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-6 h-6 text-primary" />
            <h2 className="text-primary text-xl md:text-2xl font-bold">Fila Local (No Local)</h2>
          </div>
          <span className="inline-block bg-success text-success-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            Tablet Barbearia
          </span>
          
          {localAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum cliente na fila local</p>
          ) : (
            <div className="space-y-3">
              {localAppointments.map((apt, index) => {
                const waitTime = calculateWaitTime(index);
                return (
                  <div key={apt.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 p-4 border-l-4 border-primary bg-secondary/50 rounded-r-lg">
                    <div className="text-xl font-bold text-primary min-w-[50px]">{index + 1}º</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{apt.profiles.name}</div>
                      <div className="text-muted-foreground text-sm">
                        {apt.services.title} ({apt.services.duration} min) - {apt.barbers.name}
                      </div>
                    </div>
                    <div className="text-primary text-sm flex-1">
                      {apt.status === "in_progress"
                        ? "Sendo atendido agora"
                        : `Será chamado em ~${waitTime} min`}
                    </div>
                    <span
                      className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap ${
                        apt.status === "in_progress"
                          ? "bg-warning text-warning-foreground"
                          : index === 0
                          ? "bg-success text-success-foreground"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {apt.status === "in_progress"
                        ? "EM ATENDIMENTO"
                        : index === 0
                        ? "PRÓXIMO"
                        : "AGUARDANDO"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Online Queue */}
        <section className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-info" />
            <h2 className="text-primary text-xl md:text-2xl font-bold">Fila Agendada (Online)</h2>
          </div>
          <span className="inline-block bg-info text-info-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            Clientes Remotos
          </span>
          
          {onlineAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum agendamento online hoje</p>
          ) : (
            <div className="space-y-3">
              {onlineAppointments.map((apt) => {
                const now = new Date();
                const [hours, minutes] = apt.appointment_time.split(":").map(Number);
                const appointmentTime = new Date();
                appointmentTime.setHours(hours, minutes, 0, 0);
                const minutesUntil = Math.round((appointmentTime.getTime() - now.getTime()) / 60000);

                const isToday = apt.appointment_date === today;
                const formattedDate = format(new Date(apt.appointment_date + "T12:00:00"), "dd/MM");

                return (
                  <div key={apt.id} className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 p-4 border-l-4 border-primary bg-secondary/50 rounded-r-lg">
                    <div className="text-xl font-bold text-primary min-w-[100px]">
                      {formattedDate} {apt.appointment_time.slice(0, 5)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{apt.profiles.name}</div>
                      <div className="text-muted-foreground text-sm">
                        {apt.services.title} ({apt.services.duration} min) - {apt.barbers.name}
                      </div>
                    </div>
                    <div className="text-primary text-sm flex-1">
                      {isToday 
                        ? `Agendado para ${apt.appointment_time.slice(0, 5)} - ${minutesUntil > 0 ? `Em ~${minutesUntil} min` : "Agora"}`
                        : `Agendado para ${formattedDate}`
                      }
                    </div>
                    <span className="bg-info text-info-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap">
                      AGENDADO
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Available Slots */}
        <section className="bg-card border border-border p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-success" />
            <h2 className="text-primary text-xl md:text-2xl font-bold">Horários Disponíveis Hoje</h2>
          </div>
          {availableSlots.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Sem horários disponíveis hoje</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {availableSlots.slice(0, 12).map((slot) => (
                <button
                  key={slot}
                  onClick={() => handleSlotClick(slot)}
                  className="min-h-[100px] flex flex-col justify-center items-center text-center p-4 border border-success/50 bg-success/5 hover:bg-success/10 hover:border-success transition-all duration-200 rounded-lg cursor-pointer group"
                >
                  <span className="text-2xl md:text-3xl font-bold text-primary group-hover:scale-105 transition-transform">{slot}</span>
                  <span className="text-sm text-success font-semibold mt-2">LIVRE</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <QuickBookingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          timeSlot={selectedSlot}
          date={format(new Date(), "yyyy-MM-dd")}
        />

        {/* How it works */}
        <section className="bg-card border border-border p-6 rounded-lg">
          <h2 className="text-primary text-xl md:text-2xl font-bold mb-4">Como Funciona?</h2>
          <div className="space-y-3 text-foreground">
            <p>
              <strong className="text-primary">Clientes Locais:</strong>{" "}
              <span className="text-muted-foreground">Esperam fisicamente na barbearia.</span>
            </p>
            <p>
              <strong className="text-primary">Clientes Agendados:</strong>{" "}
              <span className="text-muted-foreground">Chegam no horário agendado sem conflitos.</span>
            </p>
            <p>
              <strong className="text-primary">Garantia:</strong>{" "}
              <span className="text-muted-foreground">Múltiplos barbeiros trabalham em paralelo!</span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default FilaDaBarbearia;