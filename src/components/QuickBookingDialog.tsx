import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, ArrowLeft, Star, Scissors } from "lucide-react";

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
  timeSlot: string;
  date: string;
}

export const QuickBookingDialog = ({ open, onOpenChange, timeSlot, date }: QuickBookingDialogProps) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"barber" | "client" | "service">("barber");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    if (open) {
      loadBarbers();
      loadServices();
      setStep("barber");
      setSelectedBarberId("");
      setSelectedServiceId("");
      setClientName("");
    }
  }, [open]);

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("id, name, image_url, specialty, experience, rating")
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
    setStep("client");
  };

  const handleClientNameNext = () => {
    setStep("service");
  };

  const handleServiceSelect = async (serviceId: string) => {
    setSelectedServiceId(serviceId);
    await handleSubmit(serviceId);
  };

  const handleSubmit = async (serviceId: string) => {
    if (!selectedBarberId || !serviceId) {
      toast.error("Por favor, selecione o barbeiro e o serviço");
      return;
    }

    setLoading(true);

    try {
      // Verificar se o horário ainda está disponível (sincronização em tempo real)
      const { data: existingAppointment } = await supabase
        .from('appointments')
        .select('id')
        .eq('barber_id', selectedBarberId)
        .eq('appointment_date', date)
        .eq('appointment_time', timeSlot)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (existingAppointment) {
        toast.error("Horário já foi reservado", {
          description: "Por favor, escolha outro horário disponível.",
        });
        onOpenChange(false);
        return;
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
          appointment_time: timeSlot,
          booking_type: "local", // Mark as local booking - WILL trigger webhook
          status: "confirmed",
        })
        .select('id')
        .single();

      if (appointmentError) throw appointmentError;

      // NOTE: Removed direct WhatsApp notification to barber
      // All notifications are now handled by the external webhook system

      // Notify external webhook for UI-created appointments
      try {
        const selectedService = services.find(s => s.id === serviceId);
        const duration = selectedService?.duration || 30;
        const startDateTime = new Date(`${date}T${timeSlot}:00`);
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
        // Don't block - appointment was already created
      }

        // Disparar processamento da fila de WhatsApp (cliente + barbeiro)
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
            console.log('WhatsApp queue processed after local booking', data);
          }
        } catch (queueError) {
          console.error('Error triggering WhatsApp queue after local booking:', queueError);
          // Não bloquear o fluxo se a fila falhar
        }

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
      setStep("barber");
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

        {/* Header */}
        <div className="text-center mb-6">
          <h2 
            className="text-3xl font-bold mb-2"
            style={{ color: "#FFD700" }}
          >
            Agendamento Rápido
          </h2>
          <p className="text-gray-400">
            Horário: <span style={{ color: "#FFD700" }}>{timeSlot}</span> - {date}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin" style={{ color: "#FFD700" }} />
            <p className="text-gray-400 mt-4">Confirmando agendamento...</p>
          </div>
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
                    <div className="flex items-center justify-between mt-1 md:mt-2">
                      {barber.experience && barber.experience.trim() && (
                        <span className="text-gray-500 text-xs hidden md:inline">{barber.experience}</span>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
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
