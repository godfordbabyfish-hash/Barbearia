import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Home, MapPin, Globe, Clock, Users, Scissors, LayoutDashboard, Ban, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QuickBookingDialog } from "@/components/QuickBookingDialog";
import { format, addMinutes } from "date-fns";
import { useOperatingHours } from "@/hooks/useOperatingHours";
import { getAvailableSlotsForBarber, BarberBreak } from "@/utils/availability";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { defaultBarberAvailability } from "@/hooks/useBarberAvailability";

interface Appointment {
  id: string;
  barber_id: string;
  appointment_date: string;
  appointment_time: string;
  booking_type: string;
  status: string;
  client_name?: string;
  notes?: string;
  profiles: { name: string; phone: string };
  services: { title: string; duration: number };
  barbers: { name: string };
}

type FilaProps = {
  readOnly?: boolean;
};

const FilaDaBarbearia = ({ readOnly = false }: FilaProps) => {
  const [currentTime, setCurrentTime] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [availableSlotsByBarber, setAvailableSlotsByBarber] = useState<Record<string, string[]>>({});
  type BreakRow = { id?: string; start_time: string; end_time: string };
  const [barberBreaksByBarber, setBarberBreaksByBarber] = useState<Record<string, BreakRow[]>>({});
  const [barberMonthlySchedules, setBarberMonthlySchedules] = useState<Record<string, any>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [quickBookingPreselectedBarberId, setQuickBookingPreselectedBarberId] = useState<string | null>(null);
  const [currentUserBarberId, setCurrentUserBarberId] = useState<string | null>(null);
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [breakBarberId, setBreakBarberId] = useState<string | null>(null);
  const [breakStart, setBreakStart] = useState<string>("");
  const [breakEnd, setBreakEnd] = useState<string>("");
  const [breakMode, setBreakMode] = useState<"block" | "release">("block");
  const [breakSubmitting, setBreakSubmitting] = useState(false);
  const [breakDate, setBreakDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [breaksForDialog, setBreaksForDialog] = useState<any[]>([]);
  const [openDayDialogOpen, setOpenDayDialogOpen] = useState(false);
  const [openDayBarberId, setOpenDayBarberId] = useState<string | null>(null);
  const [openDayStart, setOpenDayStart] = useState<string>("");
  const [openDayEnd, setOpenDayEnd] = useState<string>("");
  const [manageBreaksOpen, setManageBreaksOpen] = useState(false);
  const [manageBreaksBarberId, setManageBreaksBarberId] = useState<string | null>(null);
  const [viewSlotsOpen, setViewSlotsOpen] = useState(false);
  const [viewSlotsBarberId, setViewSlotsBarberId] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();
  const { operatingHours, getTimeSlotsForDate, isDateOpen, loading: hoursLoading } = useOperatingHours();
  const { role } = useAuth();
  const isClient = role === "cliente";
  const isReadOnly = readOnly || isClient;

  const handleDashboardClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    if (role === "admin" || role === "gestor") {
      navigate("/admin");
    } else if (role === "barbeiro") {
      navigate("/barbeiro");
    } else if (role === "cliente") {
      navigate("/cliente");
    } else {
      navigate("/");
    }
  };

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
      loadBarbers();
      calculateAvailableSlots();
    }

    // Subscribe to realtime updates
    let removed = false;
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
      .subscribe((status: string) => {
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !removed) {
          removed = true;
          setTimeout(() => { try { supabase.removeChannel(channel); } catch { /* ignore */ } }, 0);
        }
      });

    return () => {
      removed = true;
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [hoursLoading]);

  const loadBreaksForToday = async () => {
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const barberIds = barbers.map((b) => b.id);
      if (barberIds.length === 0) {
        setBarberBreaksByBarber({});
        return;
      }
      const { data, error } = await (supabase as any)
        .from("barber_breaks")
        .select("id, barber_id, start_time, end_time")
        .in("barber_id", barberIds)
        .eq("date", todayStr)
        .order("start_time");
      if (error) {
        setBarberBreaksByBarber({});
        return;
      }
      const map: Record<string, BreakRow[]> = {};
      (data || []).forEach((row: any) => {
        if (!map[row.barber_id]) map[row.barber_id] = [];
        map[row.barber_id].push({
          id: row.id,
          start_time: row.start_time,
          end_time: row.end_time,
        });
      });
      setBarberBreaksByBarber(map);
    } catch {
      setBarberBreaksByBarber({});
    }
  };

  const loadAppointments = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services(title, duration),
        barbers(name)
      `)
      .eq("appointment_date", today)
      .neq("status", "completed")
      .neq("status", "cancelled")
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
        
        const phone = profile?.phone || (profile as any)?.whatsapp || "";
        return {
          ...apt,
          profiles: { 
            name: fallbackName, 
            phone
          }
        };
      });

      console.log("Appointments with profiles:", appointmentsWithProfiles);
      setAppointments(appointmentsWithProfiles as any);
    } else {
      setAppointments([]);
    }
  };

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("visible", true)
      .order("order_index");

    if (error) {
      console.error("Error loading barbers:", error);
      return;
    }

    console.log("Loaded barbers:", data);
    setBarbers(data || []);

    // Load today's monthly schedules for all barbers
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const barberIds = (data || []).map((b: any) => b.id);
      if (barberIds.length > 0) {
        const { data: schedules } = await supabase
          .from('barber_schedules' as any)
          .select('*')
          .in('barber_id', barberIds)
          .eq('date', todayStr);
        const trimTime = (t: string) => t ? String(t).substring(0, 5) : t;
        const map: Record<string, any> = {};
        (schedules || []).forEach((s: any) => {
          map[s.barber_id] = {
            open: trimTime(s.open),
            close: trimTime(s.close),
            closed: Boolean(s.closed),
            fromMonthly: true,
            lunchBreak: (s.has_lunch && s.lunch_start && s.lunch_end)
              ? { start_time: trimTime(s.lunch_start), end_time: trimTime(s.lunch_end) }
              : null,
            pauseBreak: (s.has_pause && s.pause_start && s.pause_end)
              ? { start_time: trimTime(s.pause_start), end_time: trimTime(s.pause_end) }
              : null,
          };
        });
        setBarberMonthlySchedules(map);
      }
    } catch (e) {
      console.warn('Could not load barber monthly schedules:', e);
    }

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id || null;
      if (uid && Array.isArray(data)) {
        const me = data.find((b: any) => b.user_id === uid);
        if (me?.id) {
          setCurrentUserBarberId(me.id);
        }
      }
    } catch (e) {
      console.warn("Could not resolve current barber id:", e);
      setCurrentUserBarberId(null);
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
      const slotTotalMinutes = hour * 60 + minute;
      const nowTotalMinutes = currentHour * 60 + currentMinute;
      // Permitir agendar o slot atual se ainda estivermos nos primeiros 10 minutos dele
      return slotTotalMinutes >= (nowTotalMinutes - 10);
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
  const todayDate = new Date();

  const isBarberClosedToday = (barber: any) => {
    // Prioridade: escala mensal (barber_schedules)
    if (barberMonthlySchedules[barber.id]) {
      return Boolean(barberMonthlySchedules[barber.id].closed);
    }
    // Fallback: disponibilidade semanal
    try {
      const availability = typeof barber.availability === "string"
        ? JSON.parse(barber.availability)
        : barber.availability;
      if (!availability) return false;
      const dayKeyMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
      const dayKey = dayKeyMap[todayDate.getDay()];
      return Boolean(availability?.[dayKey]?.closed);
    } catch {
      return false;
    }
  };

  const getBarberAvailableUntilToday = (barber: any): string | null => {
    // Prioridade: escala mensal (barber_schedules)
    const monthly = barberMonthlySchedules[barber.id];
    if (monthly) {
      if (monthly.closed) return null;
      return monthly.close || null;
    }
    // Fallback: disponibilidade semanal
    try {
      const availability = typeof barber.availability === "string"
        ? JSON.parse(barber.availability)
        : barber.availability;
      const dayKeyMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
      const dayKey = dayKeyMap[todayDate.getDay()];
      const day = availability?.[dayKey];
      if (!day || day.closed) return null;
      if (day.close) return String(day.close).slice(0,5);
      const shopSlots = getTimeSlotsForDate(todayDate);
      return shopSlots.length > 0 ? shopSlots[shopSlots.length - 1] : null;
    } catch {
      const shopSlots = getTimeSlotsForDate(todayDate);
      return shopSlots.length > 0 ? shopSlots[shopSlots.length - 1] : null;
    }
  };

  // Compute available slots per barber (for barber cards)
  useEffect(() => {
    if (hoursLoading || barbers.length === 0 || !isDateOpen(todayDate)) {
      setAvailableSlotsByBarber({});
      return;
    }
    loadBreaksForToday();
    const next: Record<string, string[]> = {};
    barbers.forEach((barber: any) => {
      // Respeitar disponibilidade do barbeiro (dia fechado)
      const barberAppointmentsToday = appointments
        .filter((a) => a.barber_id === barber.id && a.appointment_date === today)
        .map((a) => ({
          appointment_time: a.appointment_time,
          duration: a.services?.duration,
        }));
      // Se o barbeiro marcou o dia como fechado, não exibir slots
      let isClosed = false;
      let workingHours: { open: string; close: string } | undefined = undefined;
      let lunchBreak: BarberBreak | null = null;

      // Prioridade: escala mensal (barber_schedules)
      const monthly = barberMonthlySchedules[barber.id];
      let pauseBreak: BarberBreak | null = null;
      if (monthly) {
        isClosed = monthly.closed;
        if (!isClosed) {
          workingHours = { open: monthly.open, close: monthly.close };
          lunchBreak = monthly.lunchBreak || null;
          pauseBreak = monthly.pauseBreak || null;
        }
      } else {
        // Fallback: disponibilidade semanal
        try {
          const availability = typeof barber.availability === "string"
            ? JSON.parse(barber.availability)
            : barber.availability;
          if (availability) {
            const dayKeyMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
            const dayKey = dayKeyMap[todayDate.getDay()];
            const dayAvailability = availability?.[dayKey];
            isClosed = Boolean(dayAvailability?.closed);
            if (!isClosed) {
              const shopHours = operatingHours[dayKey];
              workingHours = {
                open: dayAvailability?.open || shopHours.open,
                close: dayAvailability?.close || shopHours.close,
              };
            }
          }
        } catch {}
      }

      const allBreaks: BarberBreak[] = [
        ...(barberBreaksByBarber[barber.id] || []),
        ...(lunchBreak ? [lunchBreak] : []),
        ...(pauseBreak ? [pauseBreak] : []),
      ];
      next[barber.id] = isClosed ? [] : getAvailableSlotsForBarber(
        todayDate,
        getTimeSlotsForDate,
        barberAppointmentsToday,
        { filterPastSlots: true, breaks: allBreaks, workingHours }
      );
    });
    setAvailableSlotsByBarber(next);
  }, [barbers, appointments, today, hoursLoading, barberBreaksByBarber, barberMonthlySchedules]);

  const localAppointments = appointments.filter((apt) => apt.booking_type === "local");
  const onlineAppointments = appointments.filter((apt) => apt.booking_type === "online");

  const inProgressCount = appointments.filter((apt) => apt.status === "in_progress").length;
  const waitingCount = appointments.filter((apt) => apt.status === "confirmed" || apt.status === "pending").length;

  // Agrupar agendamentos por barbeiro (similar ao BarbeiroDashboard)
  const getAppointmentsByBarber = () => {
    // Filtrar agendamentos de hoje e futuros (pendentes e confirmados)
    const relevantAppointments = appointments
      .filter(a => {
        const isActiveStatus = a.status === 'pending' || a.status === 'confirmed' || a.status === 'in_progress';
        return isActiveStatus;
      })
      .sort((a, b) => {
        return a.appointment_time.localeCompare(b.appointment_time);
      });

    // Agrupar por barbeiro
    const appointmentsByBarber = barbers.map(barber => {
      const barberAppointments = relevantAppointments.filter(a => a.barber_id === barber.id);
      return {
        barber,
        appointments: barberAppointments,
        todayCount: barberAppointments.filter(a => a.appointment_date === today).length,
        upcomingCount: 0,
        inProgressCount: barberAppointments.filter(a => a.status === 'in_progress').length
      };
    });

    // Ordenar barbeiros:
    // 1) o barbeiro logado primeiro (se identificado),
    // 2) depois quem tem agendamentos hoje,
    // 3) por nome
    return appointmentsByBarber.sort((a, b) => {
      if (currentUserBarberId) {
        const aIsMe = a.barber.id === currentUserBarberId;
        const bIsMe = b.barber.id === currentUserBarberId;
        if (aIsMe && !bIsMe) return -1;
        if (!aIsMe && bIsMe) return 1;
      }
      if (a.todayCount > 0 && b.todayCount === 0) return -1;
      if (a.todayCount === 0 && b.todayCount > 0) return 1;
      return a.barber.name.localeCompare(b.barber.name);
    });
  };

  const appointmentsByBarber = getAppointmentsByBarber();

  const calculateWaitTime = (index: number) => {
    let totalMinutes = 0;
    for (let i = 0; i < index; i++) {
      totalMinutes += appointments[i]?.services?.duration || 30;
    }
    return totalMinutes;
  };

  const handleSlotClick = (slot: string) => {
    setManageBreaksOpen(false);
    setSelectedSlot(slot);
    setQuickBookingPreselectedBarberId(null);
    setDialogOpen(true);
  };

  const handleBarberCardClick = (barberId: string) => {
    setViewSlotsBarberId(barberId);
    setViewSlotsOpen(true);
  };

  const handleQuickBookingClose = (open: boolean) => {
    setQuickBookingOpen(open);
    if (!open) setQuickBookingPreselectedBarberId(null);
  };

  const openBreakDialog = (barberId: string, mode: "block" | "release") => {
    setManageBreaksOpen(false);
    setBreakBarberId(barberId);
    setBreakMode(mode);
    const now = new Date();
    const start = format(now, "HH:mm");
    const end = format(addMinutes(now, 30), "HH:mm");
    setBreakStart(start);
    setBreakEnd(end);
    setBreakDate(format(new Date(), "yyyy-MM-dd"));
    setBreakDialogOpen(true);
  };

  const openOpenDayDialog = (barberId: string) => {
    setManageBreaksOpen(false);
    setOpenDayBarberId(barberId);
    const shopSlots = getTimeSlotsForDate(todayDate);
    const defaultStart = shopSlots[0] || "09:00";
    const defaultEnd = shopSlots[shopSlots.length - 1] || "18:00";
    setOpenDayStart(defaultStart);
    setOpenDayEnd(defaultEnd);
    setOpenDayDialogOpen(true);
  };

  const handleSubmitBreak = async () => {
    setBreakSubmitting(true);
    try {
      if (breakMode === "block") {
        if (!breakBarberId || !breakStart || !breakEnd) {
          toast.error("Preencha horário");
          return;
        }
        if (breakEnd <= breakStart) {
          toast.error("Fim deve ser maior que início");
          return;
        }
        const { error } = await supabase
          .from("barber_breaks")
          .insert({
            barber_id: breakBarberId,
            date: breakDate,
            start_time: breakStart,
            end_time: breakEnd,
          });
        if (error) throw error;
        toast.success("Intervalo bloqueado");
      } else {
        toast.success("Use os botões de excluir para liberar intervalos");
      }
      setBreakDialogOpen(false);
      setBreakBarberId(null);
      await loadBreaksForToday();
      await calculateAvailableSlots();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar intervalo");
    } finally {
      setBreakSubmitting(false);
    }
  };

  useEffect(() => {
    const loadBreaksForDate = async () => {
      if (!breakDialogOpen || !breakBarberId || !breakDate) {
        setBreaksForDialog([]);
        return;
      }
      const { data } = await (supabase as any)
        .from("barber_breaks")
        .select("id, start_time, end_time")
        .eq("barber_id", breakBarberId)
        .eq("date", breakDate)
        .order("start_time");
      setBreaksForDialog(data || []);
    };
    loadBreaksForDate();
  }, [breakDialogOpen, breakBarberId, breakDate]);

  const toggleClosedToday = async (barberId: string, closed: boolean) => {
    try {
      const { data, error } = await supabase
        .from("barbers")
        .select("availability")
        .eq("id", barberId)
        .maybeSingle();
      if (error) throw error;
      const base = (data?.availability as any) || {};
      const dayKeyMap = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;
      const dayKey = dayKeyMap[todayDate.getDay()];
      const currentDay = (base?.[dayKey] as any) || defaultBarberAvailability[dayKey];
      const newAvailability = { ...defaultBarberAvailability, ...base, [dayKey]: { ...currentDay, closed } };
      const { error: updError } = await supabase
        .from("barbers")
        .update({ availability: newAvailability as any })
        .eq("id", barberId);
      if (updError) throw updError;
      toast.success(closed ? "Barbeiro fechado hoje" : "Barbeiro aberto hoje");
      await loadBarbers();
      await calculateAvailableSlots();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar disponibilidade");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <h1 className="text-3xl md:text-4xl font-bold">
              <span className="text-primary">Barbearia</span>{" "}
              <span className="text-foreground">Raimundos</span>
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-primary/30 hover:border-primary hover:bg-primary/10 text-primary hover:text-primary transition-all duration-300 cursor-pointer"
                onClick={handleDashboardClick}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="font-medium">Meu Painel</span>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-primary/30 hover:border-primary hover:bg-primary/10 text-primary hover:text-primary transition-all duration-300 cursor-pointer"
              >
                <a href="/" aria-label="Ir para Início">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Início</span>
                </a>
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-semibold text-sm inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
              AO VIVO
            </span>
            <div className="text-3xl text-primary font-bold tracking-wider">{currentTime}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <Tabs defaultValue="barbeiros" className="w-full">
          <TabsList className="grid w-full grid-cols-1 mb-6">
            <TabsTrigger value="barbeiros">Agendamentos de Hoje</TabsTrigger>
          </TabsList>

          <TabsContent value="barbeiros">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {appointmentsByBarber.map(({ barber, appointments, todayCount, upcomingCount, inProgressCount }) => {
                const slots = availableSlotsByBarber[barber.id] ?? [];
                const closedToday = isBarberClosedToday(barber);
                return (
                <button
                  key={barber.id}
                  type="button"
                  onClick={isReadOnly || closedToday ? undefined : () => handleBarberCardClick(barber.id)}
                  className={`bg-card border-2 rounded-xl shadow-lg transition-all duration-300 flex flex-col text-left ${closedToday ? 'border-destructive/40 opacity-80 cursor-not-allowed' : 'border-border'} ${isReadOnly || closedToday ? '' : 'hover:shadow-xl hover:border-primary hover:bg-primary/5 cursor-pointer'}`} style={{ minHeight: '400px' }}
                >
                  <div className="p-4 border-b border-border">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarImage src={barber.photo_url || barber.image_url || ''} alt={barber.name} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                          <span>{barber.name.charAt(0).toUpperCase()}</span>
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center" translate="no">
                        <h3 className="font-bold text-lg text-primary"><span>{barber.name}</span></h3>
                        {closedToday && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/20 text-destructive border border-destructive/30">
                              <Ban className="h-3 w-3" />
                              Indisponível hoje
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Hoje: {todayCount}
                          </span>
                          {!closedToday && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Disponível até {(slots.length > 0 ? slots[slots.length - 1] : getBarberAvailableUntilToday(barber)) || '--:--'}
                            </span>
                          )}
                          {(() => {
                            const breaks = barberBreaksByBarber[barber.id] || [];
                            const monthly = barberMonthlySchedules[barber.id];
                            const allBreaks = [
                              ...breaks,
                              ...(monthly?.lunchBreak ? [{ ...monthly.lunchBreak, isLunch: true }] : []),
                              ...(monthly?.pauseBreak ? [{ ...monthly.pauseBreak, isPause: true }] : []),
                            ];
                            if (allBreaks.length === 0) return null;
                            return (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Pausas hoje:
                                {allBreaks.slice(0, 3).map((br: any, idx: number) => (
                                  <span key={`${barber.id}-${br.id || br.start_time}-${idx}`} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    br.isLunch ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' :
                                    br.isPause ? 'bg-blue-500/15 text-blue-500 border-blue-500/30' :
                                    'bg-destructive/15 text-destructive border-destructive/30'
                                  }`}>
                                    {String(br.start_time).slice(0,5)}-{String(br.end_time).slice(0,5)}
                                    {br.isLunch ? ' (Almoço)' : br.isPause ? ' (Pausa)' : ''}
                                  </span>
                                ))}
                                {allBreaks.length > 3 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground border border-border">
                                    +{allBreaks.length - 3}
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                          {/* Removido contador de futuros */}
                          {inProgressCount > 0 && (
                            <span className="flex items-center gap-1 text-warning">
                              <Scissors className="h-3 w-3" />
                              Atendendo: {inProgressCount}
                            </span>
                          )}
                        </div>
                        {(role === "admin" || role === "gestor") && (
                          <div className="mt-2 flex items-center justify-center gap-2">
                            {closedToday ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                openOpenDayDialog(barber.id);
                                }}
                              >
                                Abrir hoje
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleClosedToday(barber.id, true);
                                }}
                              >
                                Fechar hoje
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {slots.length > 0 && (
                    <div className="px-4 py-3 border-b border-border/50 flex flex-wrap gap-2 justify-center bg-secondary/10">
                      {slots.slice(0, 5).map((slot) => (
                        <span key={slot} className="px-3 py-1 bg-success text-success-foreground rounded-full text-sm font-bold shadow-sm">
                          {slot}
                        </span>
                      ))}
                      {slots.length > 5 && (
                        <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-bold border border-border">
                          +{slots.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex-1 p-3">
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {appointments.length === 0 ? (
                        <div className="text-center py-8 flex-1 flex items-center justify-center">
                          <div>
                            <Scissors className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-muted-foreground text-xs font-medium">Sem agendamentos</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {appointments.slice(0, 6).map((apt) => {
                            const formattedDate = format(new Date(apt.appointment_date + "T12:00:00"), "dd/MM");
                            const bookingTypeLabel = apt.booking_type === 'local' ? 'Local' : 
                                                   apt.booking_type === 'online' ? 'Online' : 'Manual';
                            const bookingTypeColor = apt.booking_type === 'local' ? 'bg-success/20 text-success border-success/30' : 
                                                   apt.booking_type === 'online' ? 'bg-info/20 text-info border-info/30' : 
                                                   'bg-orange-500/20 text-orange-400 border-orange-500/30';

                            return (
                              <div key={apt.id} className="flex items-center gap-2 p-2 bg-secondary/40 hover:bg-secondary/60 rounded-lg transition-all duration-200 border border-border/50">
                                <div className="flex flex-col items-center justify-center min-w-[45px] p-1 rounded bg-muted/50 flex-shrink-0">
                                  <div className="text-[9px] font-bold text-primary leading-tight text-center">
                                    {formattedDate}
                                  </div>
                                  <div className="text-[9px] font-semibold text-primary mt-0.5">
                                    {apt.appointment_time.slice(0, 5)}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  {apt.status === 'in_progress' && (
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-warning/20 text-warning text-[8px] font-bold">
                                      ▶
                                    </div>
                                  )}
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium border ${bookingTypeColor}`}>
                                    {bookingTypeLabel.charAt(0)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-foreground text-xs font-semibold mb-0.5 break-words line-clamp-1">
                                    {apt.client_name || apt.profiles.name}
                                  </div>
                                  <div className="text-muted-foreground text-[9px] break-words line-clamp-1">
                                    {apt.services.title} ({apt.services.duration}min)
                                  </div>
                                  {apt.status === 'in_progress' && (
                                    <div className="text-warning text-[8px] font-bold mt-0.5">
                                      EM ATENDIMENTO
                                    </div>
                                  )}
                                </div>
                                {(role === "admin" || role === "gestor") && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[10px]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCancelTarget(apt as any);
                                        setCancelReason('');
                                        setCancelDialogOpen(true);
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {appointments.length > 6 && (
                            <div className="text-center py-2">
                              <span className="text-xs text-muted-foreground">
                                +{appointments.length - 6} mais agendamentos
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-3 pt-2 border-t border-border text-center">
                    {isReadOnly ? (
                      <p className="text-muted-foreground text-xs font-medium">Visualização da fila (sem ações)</p>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManageBreaksOpen(false);
                            setQuickBookingPreselectedBarberId(barber.id);
                            setQuickBookingOpen(true);
                          }}
                        >
                          Agendar local
                        </Button>
                        {(role === "admin" || role === "gestor") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBreakDialog(barber.id, "block");
                              }}
                            >
                              Bloquear intervalo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBreakDialog(barber.id, "release");
                              }}
                            >
                              Liberar intervalo
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Removida aba de agendamentos futuros */}
        </Tabs>

        {!isReadOnly && !quickBookingOpen && (
          <QuickBookingDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            timeSlot={selectedSlot}
            date={today}
          />
        )}

        {!isReadOnly && quickBookingOpen && (
          <QuickBookingDialog
            open={quickBookingOpen}
            onOpenChange={handleQuickBookingClose}
            date={today}
            timeSlot={quickBookingPreselectedBarberId ? "" : availableSlots[0] ?? ""}
            preselectedBarberId={quickBookingPreselectedBarberId ?? undefined}
          />
        )}

        {(role === "admin" || role === "gestor") && (
          <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
            <DialogContent className="max-w-md w-[95vw]">
              <DialogHeader>
                <DialogTitle>{breakMode === "block" ? "Bloquear intervalo" : "Liberar intervalo"}</DialogTitle>
                <DialogDescription>
                  {breakMode === "block" ? "Selecione a data e o intervalo" : "Selecione a data e exclua pausas existentes"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={breakDate}
                      onChange={(e) => setBreakDate(e.target.value)}
                      className="h-9 text-sm"
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                </div>
                {breakMode === "block" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Início</Label>
                      <Input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Fim</Label>
                      <Input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className="h-9 text-sm" />
                    </div>
                  </div>
                )}
                {breakMode === "release" && (
                  <div className="p-2 bg-secondary/20 rounded border border-border/50">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Pausas nessa data</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {breaksForDialog.length > 0 ? (
                        breaksForDialog.map((br) => (
                          <div key={br.id || `${br.start_time}-${br.end_time}`} className="flex items-center justify-between p-2 bg-secondary/40 rounded border border-border/40">
                            <span className="text-sm font-semibold">{String(br.start_time).slice(0,5)} - {String(br.end_time).slice(0,5)}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (!br.id) return;
                                const { error } = await supabase
                                  .from("barber_breaks")
                                  .delete()
                                  .eq("id", br.id);
                                if (error) {
                                  toast.error(error.message || "Erro ao excluir pausa");
                                } else {
                                  toast.success("Pausa excluída");
                                  const { data } = await (supabase as any)
                                    .from("barber_breaks")
                                    .select("id, start_time, end_time")
                                    .eq("barber_id", breakBarberId)
                                    .eq("date", breakDate)
                                    .order("start_time");
                                  setBreaksForDialog(data || []);
                                  await loadBreaksForToday();
                                  await calculateAvailableSlots();
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Excluir
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground">Sem pausas nessa data</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setBreakDialogOpen(false)} disabled={breakSubmitting}>Cancelar</Button>
                {breakMode === "block" && (
                  <Button onClick={handleSubmitBreak} disabled={breakSubmitting}>
                    Bloquear
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {(role === "admin" || role === "gestor") && (
          <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
            <DialogContent className="max-w-md w-[95vw]">
              <DialogHeader>
                <DialogTitle>Cancelar agendamento</DialogTitle>
                <DialogDescription>Informe um motivo (opcional) e confirme o cancelamento.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {cancelTarget && (
                  <div className="p-2 bg-secondary/30 rounded border border-border/40 text-sm">
                    <div><strong>Cliente:</strong> {cancelTarget.client_name || (cancelTarget as any).profiles?.name || 'Local'}</div>
                    <div><strong>Serviço:</strong> {cancelTarget.services?.title}</div>
                    <div><strong>Data:</strong> {format(new Date(cancelTarget.appointment_date + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                    <div><strong>Hora:</strong> {cancelTarget.appointment_time}</div>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Motivo (opcional)</Label>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ex.: cliente não compareceu"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>Fechar</Button>
                  <Button
                    onClick={async () => {
                      if (!cancelTarget) return;
                      setCancelling(true);
                      try {
                        const notes = cancelReason?.trim()
                          ? `${cancelTarget.notes ? cancelTarget.notes + ' | ' : ''}Cancelado pelo gestor: ${cancelReason.trim()}`
                          : cancelTarget.notes || null;
                        const { error } = await supabase
                          .from('appointments')
                          .update({ status: 'cancelled', notes })
                          .eq('id', cancelTarget.id);
                        if (error) throw error;
                        toast.success('Agendamento cancelado');
                        setCancelDialogOpen(false);
                        setCancelTarget(null);
                        setCancelReason('');
                        await loadAppointments();
                        await calculateAvailableSlots();
                      } catch (e: any) {
                        toast.error('Erro ao cancelar', { description: e.message });
                      } finally {
                        setCancelling(false);
                      }
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {(role === "admin" || role === "gestor") && (
          <Dialog open={openDayDialogOpen} onOpenChange={setOpenDayDialogOpen}>
            <DialogContent className="max-w-md w-[95vw]">
              <DialogHeader>
                <DialogTitle>Abrir hoje</DialogTitle>
                <DialogDescription>Defina o período de atendimento de hoje</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input type="time" value={openDayStart} onChange={(e) => setOpenDayStart(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input type="time" value={openDayEnd} onChange={(e) => setOpenDayEnd(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="outline" onClick={() => setOpenDayDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (!openDayBarberId || !openDayStart || !openDayEnd || openDayEnd <= openDayStart) {
                      toast.error("Defina horários válidos");
                      return;
                    }
                    try {
                      const { data, error } = await supabase
                        .from("barbers")
                        .select("availability")
                        .eq("id", openDayBarberId)
                        .maybeSingle();
                      if (error) throw error;
                      const base = (data?.availability as any) || {};
                      const dayKeyMap = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;
                      const dayKey = dayKeyMap[todayDate.getDay()];
                      const currentDay = (base?.[dayKey] as any) || defaultBarberAvailability[dayKey];
                      const newAvailability = { ...defaultBarberAvailability, ...base, [dayKey]: { ...currentDay, closed: false, open: openDayStart, close: openDayEnd } };
                      const { error: updError } = await supabase
                        .from("barbers")
                        .update({ availability: newAvailability as any })
                        .eq("id", openDayBarberId);
                      if (updError) throw updError;
                      toast.success("Dia aberto com período definido");
                      setOpenDayDialogOpen(false);
                      setOpenDayBarberId(null);
                      await loadBarbers();
                      await calculateAvailableSlots();
                    } catch (e: any) {
                      toast.error(e.message || "Erro ao abrir hoje");
                    }
                  }}
                >
                  Abrir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {(role === "admin" || role === "gestor") && (
          <Dialog open={viewSlotsOpen} onOpenChange={setViewSlotsOpen}>
            <DialogContent className="max-w-md w-[95vw]">
              <DialogHeader>
                <DialogTitle>Horários disponíveis</DialogTitle>
                <DialogDescription>Visualização dos horários — sem ações</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="p-2 bg-secondary/20 rounded border border-border/50">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Hoje</div>
                  <div className="flex flex-wrap gap-2">
                    {(viewSlotsBarberId && (availableSlotsByBarber[viewSlotsBarberId] || []).length > 0) ? (
                      (availableSlotsByBarber[viewSlotsBarberId] || []).map((s) => (
                        <span
                          key={`${viewSlotsBarberId}-${s}`}
                          className="px-3 py-1 rounded-full text-sm font-semibold border border-border bg-secondary text-secondary-foreground"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhum horário disponível hoje para este barbeiro.</span>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </main>
    </div>
  );
};

export default FilaDaBarbearia;
