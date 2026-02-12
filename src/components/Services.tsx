import { Card, CardContent } from "@/components/ui/card";
import { Scissors, Sparkles, Wind } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import haircutImg from "@/assets/service-haircut.jpg";
import beardImg from "@/assets/service-beard.jpg";
import stylingImg from "@/assets/service-styling.jpg";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  icon: string;
  image_url: string | null;
}

const iconMap: Record<string, any> = {
  Scissors,
  Wind,
  Sparkles,
};

const defaultImages: Record<string, string> = {
  "Corte de Cabelo": haircutImg,
  "Barba & Bigode": beardImg,
  "Finalização": stylingImg,
};

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('visible', true)
      .order('order_index');

    if (!error && data) {
      setServices(data);
    }
  };

  const handleServiceClick = (service: Service) => {
    // Navigate to home page with pre-selected service, then scroll to booking section
    navigate('/', { 
      state: { 
        preSelectedService: {
          id: service.id,
          title: service.title,
          price: service.price.toFixed(2)
        }
      }
    });
    
    // Wait for navigation to complete, then scroll to booking section
    setTimeout(() => {
      const bookingSection = document.getElementById('agendamento');
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  if (services.length === 0) {
    return null;
  }

  return (
    <section id="servicos" className="py-24 px-4 bg-gradient-dark">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Nossos <span className="text-primary">Serviços</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Experiência premium em cada serviço
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8">
          {services.map((service) => {
            const Icon = iconMap[service.icon] || Scissors;
            const imageUrl = service.image_url || defaultImages[service.title] || haircutImg;
            
            return (
              <Card 
                key={service.id} 
                className="group overflow-hidden border-border hover:border-primary transition-all duration-300 hover:shadow-gold cursor-pointer"
                onClick={() => handleServiceClick(service)}
              >
                <div className="relative h-24 md:h-56 lg:h-64 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
                  <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4">
                    <Icon className="w-3 h-3 md:w-6 md:h-6 lg:w-8 lg:h-8 text-primary" />
                  </div>
                </div>
                <CardContent className="p-2 md:p-6 lg:p-6">
                  <h3 className="text-xs md:text-lg lg:text-2xl font-bold mb-1 md:mb-2 group-hover:text-primary transition-colors break-words whitespace-normal leading-tight">
                    {service.title}
                  </h3>
                  <p className="text-xs md:text-sm lg:text-base text-muted-foreground mb-2 md:mb-4 line-clamp-2">
                    {service.description}
                  </p>
                  <p className="text-sm md:text-2xl lg:text-3xl font-bold text-primary">
                    R$ {service.price.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
