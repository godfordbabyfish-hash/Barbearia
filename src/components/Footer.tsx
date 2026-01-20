import { MapPin, Phone, Mail, Clock, Instagram, Facebook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useOperatingHours, dayNames, OperatingHours } from "@/hooks/useOperatingHours";

interface FooterConfig {
  phone: string;
  email: string;
  address: string;
  maps_link?: string;
  hours?: string;
  hoursWeekday?: string;
  hoursSaturday?: string;
  social: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
}

const dayDisplayOrder: (keyof OperatingHours)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const Footer = () => {
  const { operatingHours, loading: hoursLoading } = useOperatingHours();
  const [config, setConfig] = useState<FooterConfig>({
    phone: "(11) 98765-4321",
    email: "contato@barbearia.com",
    address: "Av. Paulista, 1000 - São Paulo",
    maps_link: "",
    hours: "Seg-Sex: 9h-20h | Sáb: 9h-18h",
    social: {
      instagram: "https://instagram.com/barbearia",
      facebook: "https://facebook.com/barbearia",
      whatsapp: "5511999999999"
    }
  });

  const getMapsLink = (): string => {
    // Priorizar o link salvo do Google Maps
    if (config.maps_link) {
      return config.maps_link;
    }
    // Se não tiver link, gerar a partir do endereço
    if (config.address) {
      // Se o endereço já for um link, usar diretamente
      if (config.address.includes('http://') || config.address.includes('https://')) {
        return config.address;
      }
      // Gerar link do Google Maps a partir do endereço
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.address)}`;
    }
    return '#';
  };

  useEffect(() => {
    loadFooterConfig();
  }, []);

  const loadFooterConfig = async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .maybeSingle();

    if (!error && data) {
      setConfig(data.config_value as unknown as FooterConfig);
    }
  };

  const formatHours = () => {
    // Use operating hours from hook if available
    if (!hoursLoading) {
      return dayDisplayOrder.map((day) => (
        <div key={day} className="flex justify-between text-sm">
          <span>{dayNames[day]}:</span>
          <span className={operatingHours[day].closed ? 'text-destructive' : ''}>
            {operatingHours[day].closed 
              ? 'Fechado' 
              : `${operatingHours[day].open}–${operatingHours[day].close}`
            }
          </span>
        </div>
      ));
    }
    return <p>Carregando...</p>;
  };

  return (
    <footer className="bg-secondary/50 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-primary">Contato</h3>
            <div className="space-y-3">
              <a 
                href={`https://wa.me/${config.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>{config.phone}</span>
              </a>
              <a 
                href={`mailto:${config.email}`}
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>{config.email}</span>
              </a>
              <a
                href={getMapsLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <MapPin className="w-5 h-5" />
                <span>{config.address}</span>
              </a>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-primary">Horário</h3>
            <div className="flex items-start gap-3 text-muted-foreground">
              <Clock className="w-5 h-5 mt-1 flex-shrink-0" />
              <div className="space-y-1 flex-1">
                {formatHours()}
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-primary">Redes Sociais</h3>
            <div className="flex gap-4">
              <a 
                href={config.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-card border border-border hover:border-primary flex items-center justify-center transition-all duration-300 hover:shadow-gold"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-primary" />
              </a>
              <a 
                href={config.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-card border border-border hover:border-primary flex items-center justify-center transition-all duration-300 hover:shadow-gold"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-primary" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground">
          <p>&copy; 2025 Barbearia Raimundos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
