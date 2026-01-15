import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMobileMenuOpen(false);
  };

  const handleDashboardClick = () => {
    if (role === 'admin') navigate('/admin');
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
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Raimundos Barbearia</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('servicos')} className="text-muted-foreground hover:text-primary transition-colors">
              Serviços
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

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border bg-background/95 backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => scrollToSection('servicos')} 
                className="text-left px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
              >
                Serviços
              </button>
              <button 
                onClick={() => navigate('/shop')} 
                className="text-left px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
              >
                Shop
              </button>
              <button 
                onClick={() => scrollToSection('equipe')} 
                className="text-left px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
              >
                Equipe
              </button>
              {user ? (
                <>
                  <Button 
                    onClick={handleDashboardClick}
                    className="mx-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold"
                  >
                    Meu Painel
                  </Button>
                  <Button 
                    onClick={signOut}
                    variant="outline"
                    className="mx-4"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => scrollToSection('agendamento')}
                    className="mx-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold"
                  >
                    Agendar
                  </Button>
                  <Button 
                    onClick={() => navigate('/auth')}
                    variant="outline"
                    className="mx-4"
                  >
                    Entrar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
