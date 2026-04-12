import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";
import heroImage from "@/assets/hero-barber.jpg";
import { getSiteConfig } from '@/lib/siteConfigCache';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface HeroConfig {
  title: string;
  subtitle: string;
  description: string;
  image_url: string | null;
}

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState<HeroConfig>({
    title: "Elegância em Cada Corte",
    subtitle: "Premium Barbershop",
    description: "Experiência premium em barbearia. Estilo, sofisticação e atendimento excepcional.",
    image_url: null
  });

  useEffect(() => {
    loadHeroConfig();
  }, []);

  const loadHeroConfig = async () => {
    const value = await getSiteConfig('hero_section');
    if (value) {
      setConfig(value as unknown as HeroConfig);
    }
  };

  const scrollToBooking = () => {
    // Verificar se o usuário está autenticado
    if (!user) {
      // Se não estiver logado, redirecionar para a página de login
      navigate('/auth');
      return;
    }
    
    // Se estiver logado, fazer scroll para a seção de agendamento
    document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth' });
  };

  const backgroundImage = config.image_url || heroImage;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-primary/20">
          <Scissors className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">{config.subtitle}</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
          <span className="text-[hsl(var(--section-title-primary))]">
            {config.title.split(' ')[0]}
          </span>
          <br />
          <span className="text-[hsl(var(--section-title-accent))]">
            {config.title.split(' ').slice(1).join(' ')}
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          {config.description}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={scrollToBooking}
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-gold transition-all duration-300 hover:scale-105 px-8"
          >
            Agendar Horário
          </Button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"></div>
    </section>
  );
};

export default Hero;
