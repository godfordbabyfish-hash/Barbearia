import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Scissors, 
  Users, 
  User, 
  ShoppingBag, 
  DollarSign, 
  Settings, 
  Image as ImageIcon, 
  ArrowLeft,
  Menu,
  X,
  MessageSquare,
  LogOut,
  History
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role: 'admin' | 'gestor';
}

export const AdminSidebar = ({ activeTab, onTabChange, role }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const menuItems: MenuItem[] = [
    { id: 'services', label: 'Serviços', icon: <Scissors className="h-4 w-4" /> },
    { id: 'users', label: 'Usuários', icon: <User className="h-4 w-4" />, adminOnly: true },
    { id: 'products', label: 'Produtos', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'financial', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'advances', label: 'Vales', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'historico-cp', label: 'Histórico CP', icon: <History className="h-4 w-4" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" />, adminOnly: true },
    // Gestor também pode acessar as Configurações do Site
    { id: 'config', label: 'Configurações', icon: <Settings className="h-4 w-4" />, adminOnly: true },
    { id: 'images', label: 'Imagens', icon: <ImageIcon className="h-4 w-4" />, adminOnly: true },
  ];

  // Itens marcados como adminOnly só aparecem para admin,
  // com exceção de "config" e "users", que também são liberados para gestor.
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.adminOnly) return true;
    if ((item.id === 'config' || item.id === 'users') && (role === 'admin' || role === 'gestor')) {
      return true;
    }
    return role === 'admin';
  });

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            Painel <span className="bg-gradient-gold bg-clip-text text-transparent">
              {role === 'admin' ? 'Admin' : 'Gestor'}
            </span>
          </h2>
        </div>
        <Button 
          onClick={() => navigate('/')} 
          variant="outline" 
          size="sm"
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Site
        </Button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                "hover:bg-secondary/50 hover:text-primary",
                isActive 
                  ? "bg-primary/10 text-primary border-l-4 border-primary font-semibold" 
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Info and Logout */}
      <div className="p-4 border-t border-border space-y-2">
        {user && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/30">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">
                {role === 'admin' ? 'Administrador' : 'Gestor'}
              </div>
              <div className="text-xs text-muted-foreground">
                Usuário logado
              </div>
            </div>
          </div>
        )}
        <Button 
          onClick={async () => {
            await signOut();
            navigate('/');
          }} 
          variant="outline" 
          size="sm"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="fixed top-4 left-4 z-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 bg-card border-r border-border">
      <SidebarContent />
    </aside>
  );
};
