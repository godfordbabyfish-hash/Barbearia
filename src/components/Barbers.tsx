import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Star, Scissors, Award, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import barber1Img from "@/assets/barber-1.jpg";
import barber2Img from "@/assets/barber-2.jpg";
import barber3Img from "@/assets/barber-3.jpg";

const defaultBarberImages: Record<number, any> = {
  0: barber1Img,
  1: barber2Img,
  2: barber3Img,
};

const Barbers = () => {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<any | null>(null);

  useEffect(() => {
    loadBarbers();
  }, []);

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

  return (
    <section id="equipe" className="py-24 px-4 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-[hsl(var(--section-title-primary))]">Nossa </span>
            <span className="text-[hsl(var(--section-title-accent))]">Equipe</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Profissionais experientes e apaixonados pelo que fazem
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {barbers.map((barber, index) => (
            <Card 
              key={barber.id} 
              className="group bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-gold cursor-pointer overflow-hidden"
              onClick={() => setSelectedBarber(barber)}
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={barber.image_url || defaultBarberImages[index] || barber1Img} 
                  alt={barber.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent"></div>
              </div>
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-2">{barber.name}</h3>
                <p className="text-primary font-semibold mb-2">{barber.specialty}</p>
                <p className="text-muted-foreground mb-4">{barber.experience}</p>
                
                <div className="flex items-center justify-center gap-1">
                  {[...Array(Math.floor(Number(barber.rating)))].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modal com informações detalhadas do barbeiro */}
      <Dialog open={selectedBarber !== null} onOpenChange={(open) => !open && setSelectedBarber(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          {selectedBarber && (
            <>
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30">
                  <img 
                    src={selectedBarber.image_url || barber1Img} 
                    alt={selectedBarber.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <DialogHeader className="text-center">
                  <DialogTitle className="text-3xl font-bold mb-1">{selectedBarber.name}</DialogTitle>
                  <div className="flex items-center gap-2 text-primary font-semibold justify-center">
                    <Scissors className="w-4 h-4" />
                    {selectedBarber.specialty}
                  </div>
                </DialogHeader>
              </div>

              <div className="flex items-center gap-6 mb-6 justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{selectedBarber.experience}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(Math.floor(Number(selectedBarber.rating)))].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-6 border border-border">
                <DialogDescription className="text-center text-base text-foreground/90">
                  Profissional experiente com formação especializada em técnicas modernas de barbearia.
                  Atende com dedicação e atenção aos detalhes para garantir a satisfação de cada cliente.
                </DialogDescription>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Barbers;
