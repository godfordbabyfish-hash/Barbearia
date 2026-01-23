import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, X, LogOut, Home, ShoppingBag, Users, Calendar, Wifi, Star, Instagram, Facebook, Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [socialMenuOpen, setSocialMenuOpen] = useState(false);
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [wifiCredentials, setWifiCredentials] = useState({ username: '', password: '' });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    loadSocialConfig();
  }, []);

  const loadSocialConfig = async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .maybeSingle();

    if (!error && data) {
      const config = data.config_value as any;
      setWifiCredentials({
        username: config?.wifi?.username || '',
        password: config?.wifi?.password || '',
      });
    }
  };

  const handleWifiClick = () => {
    setSocialMenuOpen(false);
    setWifiDialogOpen(true);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copiado!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const handleSocialClick = async (type: 'google' | 'instagram' | 'facebook') => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .maybeSingle();

    if (!error && data) {
      const config = data.config_value as any;
      let url = '';
      
      if (type === 'google' && config.social?.google_reviews) {
        url = config.social.google_reviews;
      } else if (type === 'instagram' && config.social?.instagram) {
        url = config.social.instagram;
      } else if (type === 'facebook' && config.social?.facebook) {
        url = config.social.facebook;
      }

      if (url) {
        window.open(url, '_blank');
      } else {
        toast.error('Link não configurado');
      }
    }
    setSocialMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    const currentPath = window.location.pathname;
    
    // Se não estiver na página inicial, navegue primeiro para lá
    if (currentPath !== '/') {
      navigate(`/#${id}`);
      setIsMobileMenuOpen(false);
      return;
    }
    
    // Se estiver na página inicial, apenas faça scroll
    setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    setIsMobileMenuOpen(false);
  };

  const handleDashboardClick = () => {
    if (role === 'admin' || role === 'gestor') navigate('/admin');
    else if (role === 'barbeiro') navigate('/barbeiro');
    else navigate('/cliente');
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-elegant' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo with Social Menu */}
          <div className="flex items-center gap-2">
            <Popover open={socialMenuOpen} onOpenChange={setSocialMenuOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center cursor-pointer">
                    <Scissors className="w-5 h-5 text-primary-foreground" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 bg-card border-border" align="start">
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleSocialClick('google')}
                    className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                    title="Google Avaliações"
                  >
                    <Star className="w-6 h-6 text-primary" />
                  </button>
                  <button
                    onClick={() => handleSocialClick('instagram')}
                    className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                    title="Instagram"
                  >
                    <Instagram className="w-6 h-6 text-primary" />
                  </button>
                  <button
                    onClick={() => handleSocialClick('facebook')}
                    className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                    title="Facebook"
                  >
                    <Facebook className="w-6 h-6 text-primary" />
                  </button>
                  <button
                    onClick={handleWifiClick}
                    className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all"
                    title="WiFi"
                  >
                    <Wifi className="w-6 h-6 text-primary" />
                  </button>
                </div>
              </PopoverContent>
            </Popover>
            <span className="text-xl font-bold cursor-pointer" onClick={() => navigate('/')}>Barbearia Raimundos</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/servicos')} className="text-muted-foreground hover:text-primary transition-colors">
              Nossos Serviços
            </button>
            <button onClick={() => navigate('/fila')} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <Scissors className="w-4 h-4" />
              Fila
            </button>
            <button onClick={() => navigate('/shop')} className="text-muted-foreground hover:text-primary transition-colors">
              Shop
            </button>
            <button onClick={() => scrollToSection('equipe')} className="text-muted-foreground hover:text-primary transition-colors">
              Equipe
            </button>
            {user ? (
              <>
                <Button 
                  onClick={handleDashboardClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold transition-all duration-300 hover:scale-105"
                >
                  Meu Painel
                </Button>
                <Button 
                  onClick={signOut}
                  variant="outline"
                  className="transition-all duration-300 hover:scale-105"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => scrollToSection('agendamento')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold transition-all duration-300 hover:scale-105"
                >
                  Agendar
                </Button>
                <Button 
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="transition-all duration-300 hover:scale-105"
                >
                  Entrar
                </Button>
              </>
            )}
          </div>

          {/* Mobile/Tablet Menu Button */}
          <button 
            className="md:hidden text-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile/Tablet Sidebar Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent 
            side="left" 
            className="w-[85vw] max-w-sm bg-gradient-to-br from-background via-background to-background/95 backdrop-blur-xl border-r border-border/50 overflow-y-auto flex flex-col p-0"
            style={{
              boxShadow: '0 0 0 1px rgba(255, 215, 0, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.05)',
            }}
          >
            <div className="flex-1 overflow-y-auto px-6 py-6">
            <SheetHeader className="mb-6 pb-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
                  <Scissors className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold text-foreground">Barbearia Raimundos</SheetTitle>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-2">
              {/* Navigation Items */}
              <button 
                onClick={() => {
                  navigate('/');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
              >
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Início</span>
              </button>

              <button 
                onClick={() => {
                  navigate('/servicos');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
              >
                <Scissors className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Nossos Serviços</span>
              </button>

              <button 
                onClick={() => {
                  navigate('/fila');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
              >
                <Scissors className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Fila da Barbearia</span>
              </button>

              <button 
                onClick={() => {
                  navigate('/shop');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
              >
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Shop</span>
              </button>

              <button 
                onClick={() => {
                  scrollToSection('equipe');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
              >
                <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Equipe</span>
              </button>

              {user && (
                <button 
                  onClick={() => {
                    scrollToSection('agendamento');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
                >
                  <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Agendar</span>
                </button>
              )}

              {/* Divider */}
              <div className="my-4 border-t border-border/50"></div>

              {/* User Actions */}
              {user ? (
                <>
                  <Button 
                    onClick={() => {
                      handleDashboardClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold transition-all duration-300 hover:scale-[1.02] justify-start gap-3 h-auto py-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <span className="text-xs">👤</span>
                    </div>
                    <span className="font-semibold">Meu Painel</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-300"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sair</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => {
                      scrollToSection('agendamento');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold transition-all duration-300 hover:scale-[1.02] justify-start gap-3 h-auto py-3"
                  >
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">Agendar</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      navigate('/auth');
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3 border-border hover:bg-primary/10 hover:text-primary hover:border-primary transition-all duration-300"
                  >
                    <span className="font-medium">Entrar</span>
                  </Button>
                </>
              )}
            </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 bg-background/50">
              <p className="text-xs text-center text-muted-foreground">
                © {new Date().getFullYear()} Barbearia Raimundos
              </p>
          </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* WiFi Credentials Dialog */}
      <Dialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Credenciais WiFi
            </DialogTitle>
            <DialogDescription>
              Use essas credenciais para conectar-se à rede WiFi da barbearia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome da Rede (SSID)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={wifiCredentials.username}
                  readOnly
                  className="bg-secondary/50"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(wifiCredentials.username, 'username')}
                >
                  {copiedField === 'username' ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Senha</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  value={wifiCredentials.password}
                  readOnly
                  className="bg-secondary/50"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(wifiCredentials.password, 'password')}
                >
                  {copiedField === 'password' ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            {(!wifiCredentials.username || !wifiCredentials.password) && (
              <p className="text-xs text-muted-foreground">
                ⚠️ As credenciais WiFi ainda não foram configuradas pelo gestor.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;
