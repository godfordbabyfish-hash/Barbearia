import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, ArrowLeft, Star, Scissors } from "lucide-react";
import { useOperatingHours, getDayKey } from "@/hooks/useOperatingHours";
import { useAuth } from "@/contexts/AuthContext";
import { getAvailableSlotsForBarber } from "@/utils/availability";

interface Barber {
  id: string;
  name: string;
  image_url: string | null;
  specialty: string;
  experience: string;
  rating: number | null;
}

interface Service {
  id: string;
  title: string;
  description: string;
  duration: number;
  price: number;
  image_url: string | null;
  icon: string;
}

interface QuickBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  timeSlot?: string;
  preselectedBarberId?: string;
}

export const QuickBookingDialog = ({ open, onOpenChange, date, timeSlot = "", preselectedBarberId }: QuickBookingDialogProps) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"barber" | "time" | "client" | "service">("barber");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [barberSlots, setBarberSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const { getTimeSlotsForDate, isDateOpen } = useOperatingHours();
  const { user, role } = useAuth();
  const [currentUserBarberId, setCurrentUserBarberId] = useState<string>("");
  const [showCloseOption, setShowCloseOption] = useState(false);
  const [slotClosedInfo, setSlotClosedInfo] = useState<{ closed: boolean; breakId?: string; breakStart?: string; breakEnd?: string } | null>(null);
  const [slotState, setSlotState] = useState<Record<string, 'available' | 'break' | 'booked' | 'past'>>({});
  const [showAddPause, setShowAddPause] = useState(false);
  const [pauseStart, setPauseStart] = useState("");
  const [pauseEnd, setPauseEnd] = useState("");
  const [showReleaseMode, setShowReleaseMode] = useState(false);

  const isBarberPreselected = Boolean(preselectedBarberId);
  const effectiveTimeSlot = isBarberPreselected ? selectedTimeSlot : timeSlot;

  useEffect(() => {
    if (open) {
      loadBarbers();
      loadServices();
      setSelectedBarberId(preselectedBarberId ?? "");
      setSelectedTimeSlot("");
      setSelectedServiceId("");
      setClientName("");
      if (role === "barbeiro" && user?.id) {
        (async () => {
          const { data } = await (supabase as any)
            .from("barbers")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          setCurrentUserBarberId(data?.id || "");
        })();
      } else {
        setCurrentUserBarberId("");
      }
      if (preselectedBarberId) {
        setStep("service");
      } else {
        setStep("barber");
      }
    }
  }, [open, preselectedBarberId]);

  const loadSlotsForBarber = async (barberId: string) => {
    setLoadingSlots(true);
    try {
      const dateObj = new Date(date + "T12:00:00");
      if (!isDateOpen(dateObj)) {
        setBarberSlots([]);
        setSlotState({});
        return;
      }
      // Respeitar disponibilidade diária do barbeiro (dias fechados e almoço)
      let lunchBreak: { start_time: string; end_time: string } | null = null;
      try {
        const barber = barbers.find(b => b.id === barberId) as any;
        if (barber?.availability) {
          const availability = typeof barber.availability === "string"
            ? JSON.parse(barber.availability)
            : barber.availability;
          const dayKey = getDayKey(dateObj) as any;
          const dayAvailability = availability?.[dayKey];
          if (dayAvailability?.closed) {
            setBarberSlots([]);
            setSlotState({});
            return;
          }
          if (dayAvailability?.hasLunchBreak && dayAvailability.lunchStart && dayAvailability.lunchEnd) {
            lunchBreak = {
              start_time: dayAvailability.lunchStart,
              end_time: dayAvailability.lunchEnd,
            };
          }
        }
      } catch (e) {
        console.warn("Falha ao validar disponibilidade do barbeiro no dia selecionado:", e);
      }
      const { data: appts } = await supabase
        .from("appointments")
        .select("appointment_time, services(duration)")
        .eq("barber_id", barberId)
        .eq("appointment_date", date)
        .neq("status", "cancelled");
      const barberAppointments = (appts ?? []).map((a: any) => ({
        appointment_time: a.appointment_time,
        duration: a.services?.duration,
      }));
      const { data: breaks } = await (supabase as any)
        .from("barber_breaks")
        .select("start_time, end_time")
        .eq("barber_id", barberId)
        .eq("date", date);

      const allSlots = getTimeSlotsForDate(dateObj);
      const now = new Date();
      const isToday = new Date().toISOString().split('T')[0] === date;
      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const addMin = (t: string, mins: number) => {
        const h = Math.floor((timeToMinutes(t) + mins) / 60);
        const m = (timeToMinutes(t) + mins) % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      };
      const apptRanges = barberAppointments.map(a => ({
        start: a.appointment_time,
        end: addMin(a.appointment_time, a.duration ?? 30)
      }));
      const combinedBreaks = [
        ...(breaks || []),
        ...(lunchBreak ? [lunchBreak] : []),
      ];
      const breakRanges = combinedBreaks.map((b: any) => ({ start: b.start_time, end: b.end_time }));
      const computeState = (slot: string): 'available'|'break'|'booked'|'past' => {
        if (isToday) {
          const [ch, cm] = [now.getHours(), now.getMinutes()];
          const [sh, sm] = slot.split(':').map(Number);
          if (sh < ch || (sh === ch && sm <= cm)) return 'past';
        }
        const slotEnd = addMin(slot, 30);
        const overlaps = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && e1 > s2;
        // Bloqueia também o slot imediatamente após a pausa (quando slot inicia exatamente no fim da pausa)
        if (breakRanges.some(r => r.end === slot)) return 'break';
        if (breakRanges.some(r => overlaps(slot, slotEnd, r.start, r.end))) return 'break';
        if (apptRanges.some(r => overlaps(slot, slotEnd, r.start, r.end))) return 'booked';
        return 'available';
      };
      const states: Record<string,'available'|'break'|'booked'|'past'> = {};
      allSlots.forEach(s => { states[s] = computeState(s); });
      // Show only non-past slots
      let futureSlots = allSlots.filter(s => states[s] !== 'past');

      // Se um serviço foi selecionado, garantir que o bloco completo caiba sem conflito
      if (selectedServiceId) {
        const service = services.find(s => s.id === selectedServiceId);
        const duration = service?.duration ?? 30;
        const steps = Math.max(1, Math.ceil(duration / 30));
        const hasContinuousAvailability = (slot: string) => {
          let cursor = slot;
          for (let i = 0; i < steps; i++) {
            if (!states[cursor] || states[cursor] !== 'available') return false;
            cursor = addMin(cursor, 30);
          }
          return true;
        };
        futureSlots = futureSlots.filter(hasContinuousAvailability);
      }
      setSlotState(states);
      setBarberSlots(futureSlots);
    } catch (e) {
      console.error("Error loading barber slots:", e);
      setBarberSlots([]);
      setSlotState({});
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("id, name, image_url, specialty, experience, rating, availability")
      .eq("visible", true)
      .order("order_index");

    if (error) {
      console.error("Error loading barbers:", error);
      return;
    }

    setBarbers(data || []);
  };

  const loadServices = async () => {
    // Load services
    const { data: servicesData, error: servicesError } = await supabase
      .from("services")
      .select("id, title, description, duration, price, image_url, icon")
      .eq("visible", true);

    if (servicesError) {
      console.error("Error loading services:", servicesError);
      return;
    }

    if (!servicesData || servicesData.length === 0) {
      setServices([]);
      return;
    }

    // Count appointments per service
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from("appointments")
      .select("service_id")
      .neq("status", "cancelled");

    if (appointmentsError) {
      console.error("Error loading appointments count:", appointmentsError);
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

  const handleBarberSelect = (barberId: string) => {
    setSelectedBarberId(barberId);
    setStep("service");
  };

  const handleTimeSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    if (role === "barbeiro" && selectedBarberId && selectedBarberId === currentUserBarberId) {
      setShowCloseOption(true);
      (async () => {
        try {
          const { data: breaks } = await (supabase as any)
            .from("barber_breaks")
            .select("id, start_time, end_time")
            .eq("barber_id", selectedBarberId)
            .eq("date", date);
          const timeToMinutes = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
          };
          const slotStart = timeToMinutes(slot);
          const slotEnd = slotStart + 30;
          const found = (breaks || []).find((b: any) => {
            const bs = timeToMinutes(b.start_time);
            const be = timeToMinutes(b.end_time);
            return slotStart < be && slotEnd > bs;
          });
          if (found) {
            setSlotClosedInfo({ closed: true, breakId: found.id, breakStart: found.start_time, breakEnd: found.end_time });
          } else {
            setSlotClosedInfo({ closed: false });
          }
        } catch {
          setSlotClosedInfo({ closed: false });
        }
      })();
      return;
    }
    setStep("client");
  };

  const handleClientNameNext = () => {
    setStep("service");
  };

  const handleServiceSelect = async (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (!selectedBarberId) {
      toast.error("Selecione um barbeiro");
      setStep("barber");
      return;
    }
    setStep("time");
    await loadSlotsForBarber(selectedBarberId);
  };

  const handleSubmit = async (serviceId: string) => {
    if (!selectedBarberId || !serviceId) {
      toast.error("Por favor, selecione o barbeiro e o serviço");
      return;
    }
    // Tornar a seleção do horário mais resiliente: usa o selecionado no passo atual,
    // depois o effectiveTimeSlot, e por fim o timeSlot vindo das props.
    const slotToUse = selectedTimeSlot || effectiveTimeSlot || timeSlot;
    if (!slotToUse) {
      toast.error("Por favor, selecione um horário");
      return;
    }

    setLoading(true);

    try {
      // Verificar se o dia está fechado para o barbeiro
      try {
        const barber = barbers.find(b => b.id === selectedBarberId) as any;
        if (barber?.availability) {
          const availability = typeof barber.availability === "string"
            ? JSON.parse(barber.availability)
            : barber.availability;
          const dayKey = getDayKey(new Date(date + "T12:00:00")) as any;
          if (availability?.[dayKey]?.closed) {
            toast.error("Barbeiro indisponível nesta data", {
              description: "Este barbeiro bloqueou a agenda para este dia.",
            });
            return;
          }
        }
      } catch (e) {
        console.warn("Falha ao validar dia fechado no agendamento rápido:", e);
      }
      // Validações de conflito no momento do envio (paridade com online)
      const selectedService = services.find(s => s.id === serviceId);
      const newDuration = selectedService?.duration ?? 30;
      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const newStart = timeToMinutes(slotToUse);
      const newEnd = newStart + newDuration;
      // 1) Conflito com agendamentos existentes (sobreposição de intervalos)
      const { data: appts } = await supabase
        .from('appointments')
        .select('appointment_time, services(duration)')
        .eq('barber_id', selectedBarberId)
        .eq('appointment_date', date)
        .neq('status', 'cancelled');
      const hasAppointmentOverlap = (appts || []).some((a: any) => {
        const aStart = timeToMinutes(a.appointment_time);
        const aEnd = aStart + (a.services?.duration ?? 30);
        return newStart < aEnd && newEnd > aStart;
      });
      if (hasAppointmentOverlap) {
        toast.error("Horário em conflito com outro atendimento", {
          description: "Escolha outro horário disponível.",
        });
        return;
      }
      // 2) Conflito com pausas/bloqueios
      const { data: breaks } = await (supabase as any)
        .from('barber_breaks')
        .select('start_time, end_time')
        .eq('barber_id', selectedBarberId)
        .eq('date', date);
      const hasBreakOverlap = (breaks || []).some((b: any) => {
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);
        return newStart < bEnd && newEnd > bStart;
      });
      if (hasBreakOverlap) {
        toast.error("Horário entra em uma pausa do barbeiro", {
          description: "Escolha outro horário ou ajuste as pausas.",
        });
        return;
      }
      // 3) Evitar horários passados (se for hoje)
      const isToday = new Date().toISOString().split('T')[0] === date;
      if (isToday) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (newStart <= nowMin) {
          toast.error("Horário já passou. Selecione um horário futuro.");
          return;
        }
      }
      const localPhone = "00000000000";
      const localName = clientName.trim() || "LOCAL";


      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", localPhone)
        .maybeSingle();

      let clientId = existingProfile?.id;

      if (!clientId) {
        const tempEmail = `${localPhone}@local.com`;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: tempEmail,
          password: localPhone,
          options: {
            data: {
              name: localName,
              phone: localPhone,
            },
          },
        });

        if (authError && !authError.message.includes("already registered")) {
          throw authError;
        }
        
        if (authError?.message.includes("already registered")) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("phone", localPhone)
            .maybeSingle();
          clientId = profile?.id;
        } else {
          clientId = authData?.user?.id;
        }
      }

      if (!clientId) {
        throw new Error("Erro ao criar perfil");
      }

      const { data: newAppointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          client_id: clientId,
          barber_id: selectedBarberId,
          service_id: serviceId,
          appointment_date: date,
          appointment_time: slotToUse,
          booking_type: "local", // Mark as local booking - WILL trigger webhook
          status: "confirmed",
        })
        .select('id')
        .single();

      if (appointmentError) throw appointmentError;

      // Processamento em background para não travar a UI
      const runBackgroundNotifications = async () => {
        // Notify external webhook for UI-created appointments
        try {
          const selectedService = services.find(s => s.id === serviceId);
          const duration = selectedService?.duration || 30;
          const startDateTime = new Date(`${date}T${slotToUse}:00`);
          const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

          // Get the current user (barber who created the local appointment)
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const userId = currentUser?.id || clientId; // Fallback to clientId if no user

          await supabase.functions.invoke('api', {
            body: {
              action: 'notify-webhook',
              appointmentId: newAppointment.id,
              clientName: localName === "LOCAL" ? 'LOCAL (presencial)' : localName,
              phone: '00000000000',
              service: selectedService?.title || 'Serviço',
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString(),
              userId: userId,
              notes: null,
            }
          });
          console.log('External webhook notification sent for local booking');
        } catch (webhookError) {
          console.error('Error notifying external webhook:', webhookError);
        }

        // Disparar processamento da fila de WhatsApp (cliente + barbeiro)
        try {
          // Obter o token de autenticação do usuário
          const { data: { session } } = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          if (supabaseUrl) {
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
              console.log('WhatsApp queue processed after local booking', data);
            }
          } else {
            console.error('VITE_SUPABASE_URL não configurado');
          }
        } catch (queueError) {
          console.error('Error triggering WhatsApp queue after local booking:', queueError);
        }
      };

      // Inicia as notificações sem await para liberar a UI imediatamente
      runBackgroundNotifications();

      toast.success(localName === "LOCAL" 
        ? "Agendamento local realizado com sucesso!" 
        : `Agendamento para ${localName} realizado com sucesso!`);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error("Erro ao criar agendamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step === "service") {
      setStep("client");
      setSelectedServiceId("");
    } else if (step === "client") {
      if (isBarberPreselected) {
        setStep("time");
      } else {
        setStep("barber");
      }
    } else if (step === "time") {
      if (isBarberPreselected) {
        handleClose();
      } else {
        setStep("barber");
      }
    }
  };

  const fetchBreakInfoForSlot = async (slot: string) => {
    try {
      const { data: breaks } = await (supabase as any)
        .from("barber_breaks")
        .select("id, start_time, end_time")
        .eq("barber_id", selectedBarberId)
        .eq("date", date);
      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const slotStart = timeToMinutes(slot);
      const slotEnd = slotStart + 30;
      const found = (breaks || []).find((b: any) => {
        const bs = timeToMinutes(b.start_time);
        const be = timeToMinutes(b.end_time);
        return slotStart < be && slotEnd > bs;
      });
      if (!found) return null;
      return { breakId: found.id, breakStart: found.start_time, breakEnd: found.end_time };
    } catch {
      return null;
    }
  };

  const openSlotAt = async (slot: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !user?.id) {
        toast.error("Faça login como barbeiro para liberar horário");
        return;
      }
      if (selectedBarberId !== currentUserBarberId) {
        toast.error("Você só pode liberar horários do seu perfil");
        return;
      }
      const info = await fetchBreakInfoForSlot(slot);
      if (!info?.breakId || !info.breakStart || !info.breakEnd) {
        toast.error("Nenhuma pausa encontrada para este horário");
        return;
      }
      const timeToMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const minutesToTime = (n: number) => {
        const h = String(Math.floor(n / 60)).padStart(2, "0");
        const m = String(n % 60).padStart(2, "0");
        return `${h}:${m}`;
      };
      const slotStart = timeToMinutes(slot);
      const slotEnd = slotStart + 30;
      const breakStart = timeToMinutes(info.breakStart);
      const breakEnd = timeToMinutes(info.breakEnd);
      if (breakStart === slotStart && breakEnd === slotEnd) {
        const { error } = await (supabase as any)
          .from("barber_breaks")
          .delete()
          .eq("id", info.breakId);
        if (error) throw error;
      } else if (breakStart === slotStart && breakEnd > slotEnd) {
        const { error } = await (supabase as any)
          .from("barber_breaks")
          .update({ start_time: minutesToTime(slotEnd) })
          .eq("id", info.breakId);
        if (error) throw error;
      } else if (breakStart < slotStart && breakEnd === slotEnd) {
        const { error } = await (supabase as any)
          .from("barber_breaks")
          .update({ end_time: minutesToTime(slotStart) })
          .eq("id", info.breakId);
        if (error) throw error;
      } else {
        const { error: updateErr } = await (supabase as any)
          .from("barber_breaks")
          .update({ end_time: minutesToTime(slotStart) })
          .eq("id", info.breakId);
        if (updateErr) throw updateErr;
        const { error: insertErr } = await (supabase as any)
          .from("barber_breaks")
          .insert({
            barber_id: selectedBarberId,
            date,
            start_time: minutesToTime(slotEnd),
            end_time: minutesToTime(breakEnd),
          });
        if (insertErr) throw insertErr;
      }
      toast.success(`Horário ${slot} liberado`);
      await loadSlotsForBarber(selectedBarberId);
    } catch {
      toast.error("Erro ao liberar horário");
    }
  };

  if (!open) return null;

  const selectedBarber = barbers.find(b => b.id === selectedBarberId);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
      onClick={handleOverlayClick}
    >
      <div 
        className="relative w-full max-w-4xl mx-4 p-6 rounded-lg max-h-[95vh] overflow-y-auto"
        style={{ 
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          border: "2px solid #FFD700",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center mb-6">
          <h2 
            className="text-3xl font-bold mb-2"
            style={{ color: "#FFD700" }}
          >
            Agendamento Rápido
          </h2>
          <p className="text-gray-400 mb-2">
            Selecione o barbeiro e o serviço para agendar seu horário.
          </p>
          <p className="text-gray-400">
            {effectiveTimeSlot ? (
              <>Horário: <span style={{ color: "#FFD700" }}>{effectiveTimeSlot}</span> - {date}</>
            ) : (
              <>Data: <span style={{ color: "#FFD700" }}>{date}</span></>
            )}
          </p>
        </div>
        {/* Gestão de Pausa - agora disponível em toda a tela */}
        {role === "barbeiro" && selectedBarberId === currentUserBarberId && (
          <div className="w-full max-w-2xl mx-auto mb-6">
            <div className="flex flex-col gap-2 items-stretch">
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowAddPause(v => !v)}
                  className="px-4 py-2 text-sm font-semibold rounded-md"
                  style={{ backgroundColor: "#FFD700", color: "#000" }}
                >
                  {showAddPause ? "Cancelar adição de pausa" : "Adicionar pausa (almoço/intervalo)"}
                </Button>
              </div>
              {showAddPause && (
                <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                  <select
                    value={pauseStart}
                    onChange={(e) => setPauseStart(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                  >
                    <option value="">Início</option>
                    {getTimeSlotsForDate(new Date(date + "T12:00:00")).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <select
                    value={pauseEnd}
                    onChange={(e) => setPauseEnd(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-2"
                  >
                    <option value="">Fim</option>
                    {getTimeSlotsForDate(new Date(date + "T12:00:00")).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Button
                    onClick={async () => {
                      try {
                        if (!pauseStart || !pauseEnd) {
                          toast.error("Selecione início e fim da pausa");
                          return;
                        }
                        const toMin = (s: string) => {
                          const [h, m] = s.split(":").map(Number);
                          return h * 60 + m;
                        };
                        const startMin = toMin(pauseStart);
                        const endMin = toMin(pauseEnd);
                        if (endMin <= startMin) {
                          toast.error("Fim da pausa deve ser após o início");
                          return;
                        }
                        const { data: appts } = await supabase
                          .from("appointments")
                          .select("appointment_time, services(duration)")
                          .eq("barber_id", selectedBarberId)
                          .eq("appointment_date", date)
                          .neq("status", "cancelled");
                        const apptOverlap = (appts || []).some((a: any) => {
                          const aStart = toMin(a.appointment_time);
                          const aEnd = aStart + (a.services?.duration ?? 30);
                          return startMin < aEnd && endMin > aStart;
                        });
                        if (apptOverlap) {
                          toast.error("Intervalo conflita com um atendimento");
                          return;
                        }
                        const { data: breaks } = await (supabase as any)
                          .from("barber_breaks")
                          .select("start_time, end_time")
                          .eq("barber_id", selectedBarberId)
                          .eq("date", date);
                        const breakOverlap = (breaks || []).some((b: any) => {
                          const bStart = toMin(b.start_time);
                          const bEnd = toMin(b.end_time);
                          return startMin < bEnd && endMin > bStart;
                        });
                        if (breakOverlap) {
                          toast.error("Intervalo conflita com outra pausa");
                          return;
                        }
                        const { error } = await (supabase as any)
                          .from("barber_breaks")
                          .insert({
                            barber_id: selectedBarberId,
                            date,
                            start_time: pauseStart,
                            end_time: pauseEnd,
                          });
                        if (error) {
                          toast.error("Erro ao adicionar pausa");
                          return;
                        }
                        toast.success("Pausa adicionada");
                        setShowAddPause(false);
                        setPauseStart("");
                        setPauseEnd("");
                        await loadSlotsForBarber(selectedBarberId);
                      } catch {
                        toast.error("Erro ao adicionar pausa");
                      }
                    }}
                    className="bg-red-700 hover:bg-red-800 px-4 py-2 text-sm rounded-md"
                  >
                    Salvar pausa
                  </Button>
                  <Button
                    onClick={async () => {
                      if (role !== "barbeiro" || selectedBarberId !== currentUserBarberId) {
                        toast.error("Você só pode liberar horários do seu perfil");
                        return;
                      }
                      // Entrar em modo de liberação e ir para passo de horários se necessário
                      if (step !== "time") {
                        if (!selectedBarberId) {
                          toast.error("Selecione um barbeiro");
                          return;
                        }
                        await loadSlotsForBarber(selectedBarberId);
                        setStep("time");
                      }
                      setShowReleaseMode(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm rounded-md"
                  >
                    Liberar horário
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin" style={{ color: "#FFD700" }} />
            <p className="text-gray-400 mt-4">Confirmando agendamento...</p>
          </div>
        ) : step === "time" ? (
          <>
            <div className="flex items-center gap-4 mb-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Voltar
              </button>
              {selectedBarber && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: "#FFD700" }}>
                    {selectedBarber.image_url ? (
                      <img src={selectedBarber.image_url} alt={selectedBarber.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-white font-medium">{selectedBarber.name}</span>
                </div>
              )}
            </div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Horários disponíveis - <span style={{ color: "#FFD700" }}>{date}</span>
              </h3>
              <p className="text-gray-400 text-sm mt-1">Selecione um horário para continuar</p>
            </div>
            
            {showReleaseMode && (
              <div className="mb-6">
                <p className="text-center text-gray-300 mb-2">Horários bloqueados (clique para liberar)</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Object.keys(slotState).filter(s => slotState[s] === 'break').length === 0 ? (
                    <span className="text-sm text-gray-500">Nenhum horário bloqueado hoje.</span>
                  ) : (
                    Object.keys(slotState)
                      .filter(s => slotState[s] === 'break')
                      .map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => openSlotAt(s)}
                          className="px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105"
                          style={{ backgroundColor: '#1e3a8a', color: '#fff', border: '2px solid #3b82f6' }}
                        >
                          {s}
                        </button>
                      ))
                  )}
                </div>
                <div className="flex justify-center mt-3">
                  <Button
                    variant="outline"
                    className="px-4 py-2 text-sm rounded-md"
                    onClick={() => setShowReleaseMode(false)}
                  >
                    Concluir liberação
                  </Button>
                </div>
              </div>
            )}
            {showCloseOption ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="text-white font-semibold">Escolha uma ação para {selectedBarber?.name}</div>
                <div className="w-full flex justify-center">
                  <Button
                    onClick={async () => {
                      // Fluxo prático de atendimento local:
                      // 1) Usa o serviço selecionado se houver; caso contrário, escolhe o mais usado (primeiro da lista).
                      // 2) Cria o agendamento imediatamente usando o slot selecionado.
                      try {
                        const autoServiceId = selectedServiceId || services[0]?.id;
                        if (!autoServiceId) {
                          toast.error("Nenhum serviço disponível para agendar. Cadastre um serviço.");
                          return;
                        }
                        await handleSubmit(autoServiceId);
                        setShowCloseOption(false);
                      } catch {
                        // handleSubmit já apresenta toasts de erro
                      }
                    }}
                    className="px-4 py-3 text-sm rounded-md w-full max-w-md font-semibold"
                    style={{ backgroundColor: "#FFD700", color: "#000" }}
                  >
                    Seguir atendimento
                  </Button>
                </div>
              </div>
            ) : loadingSlots ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#FFD700" }} />
                <p className="text-gray-400 mt-2">Carregando horários...</p>
              </div>
            ) : barberSlots.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Nenhum horário disponível para este barbeiro hoje.</p>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {barberSlots.map((slot) => {
                  const state = slotState[slot] || 'available';
                  const isSelected = selectedTimeSlot === slot;
                  const isBarberSelf = (role === "barbeiro" && selectedBarberId && selectedBarberId === currentUserBarberId);
                  const bg =
                    state === 'break' ? '#8b0000' : // vermelho escuro
                    state === 'booked' ? '#3a3a3a' :
                    isSelected ? '#FFD700' : '#2a2a2a';
                  const color =
                    state === 'break' ? '#fff' :
                    state === 'booked' ? '#bbb' :
                    isSelected ? '#000' : '#fff';
                  const border =
                    isSelected ? '#FFD700' :
                    state === 'break' ? '#ff4d4d' :
                    'transparent';
                  const disabled = state === 'booked' || state === 'past' || (!isBarberSelf && state === 'break');
                  return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => !disabled && handleTimeSelect(slot)}
                    className="px-4 py-2 rounded-lg font-semibold transition-all hover:scale-105"
                    style={{
                      backgroundColor: bg,
                      color,
                      border: `2px solid ${border}`,
                      opacity: disabled ? 0.7 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                    disabled={disabled}
                  >
                    {slot}
                  </button>
                )})}
              </div>
            )}
          </>
        ) : step === "barber" ? (
          <>
            {/* Barber Selection */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Nossos <span style={{ color: "#FFD700" }}>Barbeiros</span>
              </h3>
              <p className="text-gray-400 text-sm mt-1">Selecione seu barbeiro preferido</p>
            </div>

            <div className={`grid gap-3 md:gap-4 ${barbers.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : barbers.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' : 'grid-cols-3 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => handleBarberSelect(barber.id)}
                  className="group relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02] text-left"
                  style={{ 
                    border: "2px solid transparent",
                    background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#FFD700"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    {barber.image_url ? (
                      <img 
                        src={barber.image_url} 
                        alt={barber.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <Scissors className="h-8 w-8 md:h-16 md:w-16 text-gray-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  </div>
                  <div className="p-2 md:p-4">
                    <h4 className="text-xs md:text-base lg:text-lg font-bold text-white line-clamp-1">{barber.name}</h4>
                    <p className="text-gray-400 text-xs md:text-sm line-clamp-1">{barber.specialty}</p>
                    <div className="flex items-center justify-end mt-1 md:mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-500 text-yellow-500" />
                        <span style={{ color: "#FFD700" }} className="font-semibold text-xs md:text-sm">
                          {barber.rating?.toFixed(1) || "5.0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : step === "client" ? (
          <>
            {/* Client Name Input */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Voltar
              </button>
              {selectedBarber && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: "#FFD700" }}>
                    {selectedBarber.image_url ? (
                      <img src={selectedBarber.image_url} alt={selectedBarber.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-white font-medium">{selectedBarber.name}</span>
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Nome do <span style={{ color: "#FFD700" }}>Cliente</span>
              </h3>
              <p className="text-gray-400 text-sm mt-1">Opcional - Deixe em branco para agendamento local</p>
            </div>

            <div className="max-w-md mx-auto mb-6">
              <Label htmlFor="clientName" className="text-gray-300 mb-2 block">
                Nome do Cliente (Opcional)
              </Label>
              <Input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Digite o nome do cliente ou deixe em branco para LOCAL"
                className="w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-yellow-500"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleClientNameNext();
                  }
                }}
              />
              {clientName.trim() === "" && (
                <p className="text-xs text-gray-500 mt-2">
                  ℹ️ Se deixar em branco, será criado como agendamento "LOCAL"
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleClientNameNext}
                className="px-8 py-6 text-lg font-semibold"
                style={{
                  backgroundColor: "#FFD700",
                  color: "#000",
                }}
              >
                Continuar para Serviços
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Service Selection */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Voltar
              </button>
              {selectedBarber && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: "#FFD700" }}>
                    {selectedBarber.image_url ? (
                      <img src={selectedBarber.image_url} alt={selectedBarber.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <span className="text-white font-medium">{selectedBarber.name}</span>
                  {clientName.trim() && (
                    <span className="text-gray-400 text-sm">• {clientName}</span>
                  )}
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Nossos <span style={{ color: "#FFD700" }}>Serviços</span>
              </h3>
              <p className="text-gray-400 text-sm mt-1">Selecione o serviço desejado</p>
            </div>

            <div className={`grid gap-4 ${services.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : services.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="group relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02] text-left"
                  style={{ 
                    border: "2px solid transparent",
                    background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "#FFD700"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {service.image_url ? (
                      <img 
                        src={service.image_url} 
                        alt={service.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <span className="text-4xl">{service.icon}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <span className="text-2xl" style={{ color: "#FFD700" }}>{service.icon}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-lg font-bold text-white">{service.title}</h4>
                    <p className="text-gray-400 text-sm line-clamp-2 mt-1">{service.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-gray-500 text-sm">{service.duration} min</span>
                      <span className="text-xl font-bold" style={{ color: "#FFD700" }}>
                        R$ {service.price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
