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
  X
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

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

  const menuItems: MenuItem[] = [
    { id: 'services', label: 'Serviços', icon: <Scissors className="h-4 w-4" /> },
    { id: 'barbeiros', label: 'Barbeiros', icon: <Users className="h-4 w-4" /> },
    { id: 'users', label: 'Usuários', icon: <User className="h-4 w-4" />, adminOnly: true },
    { id: 'products', label: 'Produtos', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'financial', label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'config', label: 'Configurações', icon: <Settings className="h-4 w-4" />, adminOnly: true },
    { id: 'images', label: 'Imagens', icon: <ImageIcon className="h-4 w-4" />, adminOnly: true },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || role === 'admin');

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
