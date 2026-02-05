import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, X, LogOut, Home, ShoppingBag, Users, Calendar, Wifi, Star, Instagram, Facebook, QrCode, Copy, Smartphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [socialMenuOpen, setSocialMenuOpen] = useState(false);
  const [wifiCredentials, setWifiCredentials] = useState({ username: '', password: '' });
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ name: string; photo_url: string | null } | null>(null);
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

  useEffect(() => {
    if (user) {
      loadUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user, role]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      if (user) {
        loadUserProfile();
      }
    };
    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, [user, role]);

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

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, cpf, photo_url")
        .eq("id", user.id)
        .maybeSingle();

      const nameFromProfile = profile?.name?.trim() || "";
      const cpfFromProfile = profile?.cpf || "";
      const nameFromMeta = (user as any)?.user_metadata?.name?.trim() || "";
      const fallbackName = user.email?.split("@")[0] || "Usuário";
      const nameLooksLikeCpf =
        nameFromProfile && nameFromProfile.replace(/\D/g, "") === cpfFromProfile;

      let name = nameLooksLikeCpf
        ? (nameFromMeta || fallbackName)
        : (nameFromProfile || nameFromMeta || fallbackName);
      let photoUrl = profile?.photo_url || null;

      if (role === "barbeiro") {
        const { data: barber } = await supabase
          .from("barbers")
          .select("name, image_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (barber) {
          name = barber.name || name;
          photoUrl = barber.image_url || photoUrl;
        }
      }

      setUserProfile({ name, photo_url: photoUrl });
    } catch (error) {
      console.error("Error loading user profile:", error);
      setUserProfile({ name: user.email?.split("@")[0] || "Usuário", photo_url: null });
    }
  };

  const handleWifiClick = async () => {
    setSocialMenuOpen(false);
    
    // Verificar se tem credenciais configuradas
    if (!wifiCredentials.username || !wifiCredentials.password) {
      toast.error('Credenciais WiFi não configuradas pelo gestor');
      return;
    }

    // Gerar QR Code
    await generateWifiQRCode();
    setWifiDialogOpen(true);
  };

  const generateWifiQRCode = async () => {
    try {
      // Formato padrão WiFi para QR Code (funciona em Android e iOS)
      const wifiString = `WIFI:T:WPA;S:${wifiCredentials.username};P:${wifiCredentials.password};H:false;;`;
      
      // Gerar QR Code usando API pública (alternativa simples)
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(wifiString)}`;
      setQrCodeDataUrl(qrApiUrl);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code WiFi');
    }
  };

  const copyWifiCredentials = async () => {
    try {
      const wifiString = `WIFI:T:WPA;S:${wifiCredentials.username};P:${wifiCredentials.password};H:false;;`;
      await navigator.clipboard.writeText(wifiString);
      
      toast.success('✅ Credenciais copiadas!', {
        description: 'Cole em um leitor de QR Code ou configurações WiFi',
        duration: 3000,
      });
    } catch (error) {
      // Fallback para dispositivos que não suportam clipboard
      toast.info('📋 Credenciais WiFi', {
        description: `Rede: ${wifiCredentials.username}`,
        duration: 5000,
      });
    }
  };

  const connectToWifi = async () => {
    const wifiString = `WIFI:T:WPA;S:${wifiCredentials.username};P:${wifiCredentials.password};H:false;;`;
    
    // Detectar dispositivo
    const isAndroid = navigator.userAgent.match(/Android/i);
    const isIOS = navigator.userAgent.match(/iPhone|iPad|iPod/i);
    
    try {
      // Copiar para clipboard primeiro
      await navigator.clipboard.writeText(wifiString);
      
      if (isAndroid) {
        // Android: Tentar abrir configurações WiFi (funciona em alguns navegadores)
        try {
          // Tentar abrir configurações WiFi diretamente
          window.open('intent://wifi#Intent;scheme=android.settings;package=com.android.settings;end');
        } catch (error) {
          // Fallback: Instruções
        }
        
        toast.success('📱 Android - Próximos Passos:', {
          description: '1. Abra Configurações > WiFi\n2. Cole os dados copiados\n3. Ou escaneie o QR Code com a câmera',
          duration: 6000,
        });
        
      } else if (isIOS) {
        // iOS: Tentar abrir configurações WiFi
        try {
          window.open('App-Prefs:root=WIFI');
        } catch (error) {
          // Fallback: Instruções
        }
        
        toast.success('📱 iPhone - Próximos Passos:', {
          description: '1. Abra Configurações > WiFi\n2. Ou escaneie o QR Code com a câmera (mais fácil)',
          duration: 6000,
        });
        
      } else {
        // Desktop
        toast.info('💻 Desktop - Use seu celular:', {
          description: 'Escaneie o QR Code com a câmera do seu celular para conectar automaticamente',
          duration: 5000,
        });
      }
      
      // Mostrar toast adicional sobre QR Code
      setTimeout(() => {
        toast.info('💡 Dica:', {
          description: 'Escanear o QR Code é mais rápido e conecta automaticamente!',
          duration: 4000,
        });
      }, 2000);
      
    } catch (error) {
      // Se não conseguir copiar, mostrar credenciais
      toast.info('📶 Credenciais WiFi:', {
        description: `Rede: ${wifiCredentials.username}\nEscaneie o QR Code para conectar automaticamente`,
        duration: 8000,
      });
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
    // Cada tipo de usuário vai para seu próprio painel
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
          {/* Logo with Social Menu and Home Button */}
          <div className="flex items-center gap-4">
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
            
            {/* Home Button */}
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-primary/30 hover:border-primary hover:bg-primary/10 text-primary hover:text-primary transition-all duration-300"
            >
              <Home className="w-4 h-4" />
              <span className="font-medium">Início</span>
            </Button>
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
            <button onClick={() => navigate('/equipe')} className="text-muted-foreground hover:text-primary transition-colors">
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
                {userProfile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/50">
                    <Avatar className="h-8 w-8">
                      {userProfile.photo_url ? (
                        <AvatarImage src={userProfile.photo_url} alt={userProfile.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {!isMobile && (
                      <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
                        {userProfile.name}
                      </span>
                    )}
                  </div>
                )}
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

          {/* Mobile/Tablet User + Menu */}
          <div className="md:hidden flex items-center gap-2">
            {userProfile && (
              <Avatar className="h-9 w-9">
                {userProfile.photo_url ? (
                  <AvatarImage src={userProfile.photo_url} alt={userProfile.name} />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {userProfile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <button 
              className="text-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
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
                  navigate('/equipe');
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
                  {userProfile && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/30 border border-border/50 mb-2">
                      <Avatar className="h-9 w-9">
                        {userProfile.photo_url ? (
                          <AvatarImage src={userProfile.photo_url} alt={userProfile.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                          {userProfile.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {userProfile.name}
                        </div>
                      </div>
                    </div>
                  )}
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

      {/* Modal WiFi */}
      <Dialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-primary" />
              Conectar ao WiFi
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou use as instruções abaixo para conectar à rede.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-border">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code WiFi" 
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-secondary rounded">
                    <QrCode className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Escaneie para Conectar</h3>
                <p className="text-sm text-muted-foreground">
                  Use a câmera do seu celular para escanear o QR Code
                </p>
              </div>
            </div>

            {/* Instruções por dispositivo */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <Smartphone className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">Android</p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Abra a câmera e aponte para o QR Code. Toque na notificação para conectar automaticamente.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Smartphone className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-400">iPhone/iPad</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Abra a câmera e aponte para o QR Code. Toque no banner que aparece para conectar.
                  </p>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <Button
                onClick={connectToWifi}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Abrir Configurações
              </Button>
              <Button
                onClick={copyWifiCredentials}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Dados
              </Button>
            </div>

            {/* Destaque para QR Code */}
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <QrCode className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">Conexão Automática</span>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Mais fácil:</strong> Escaneie o QR Code com a câmera do celular para conectar automaticamente sem digitar senha!
              </p>
            </div>

            {/* Informações da rede */}
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Rede: <span className="font-medium text-foreground">{wifiCredentials.username}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Conexão segura WPA/WPA2
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </nav>
  );
};

export default Navbar;
