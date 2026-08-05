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
  Menu,
  MessageSquare,
  LogOut,
  History,
  ListChecks,
  Gift,
  Boxes,
  LayoutDashboard,
  ShieldCheck,
  BellRing,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange, role, collapsed, onCollapsedChange }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  const isCollapsedRaw = collapsed !== undefined ? collapsed : internalCollapsed;
  const isCollapsed = isMobile ? false : isCollapsedRaw;
  const setIsCollapsed = (value: boolean) => {
    if (onCollapsedChange) onCollapsedChange(value);
    else setInternalCollapsed(value);
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard Gerencial', icon: <LayoutDashboard className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'alerts', label: 'Central de Alertas', icon: <BellRing className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'services-products', label: 'Serviços & Produtos', icon: <Scissors className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'users', label: 'Usuários', icon: <User className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />, adminOnly: true },
    { id: 'financial', label: 'Financeiro', icon: <DollarSign className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'historico-cp', label: 'Histórico CP', icon: <History className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'fila', label: 'Fila', icon: <ListChecks className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'referrals', label: 'Indicações', icon: <Gift className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'supplies', label: 'Estoque de Insumos', icon: <Boxes className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'audit', label: 'Auditoria', icon: <ShieldCheck className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageSquare className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />, adminOnly: true },
    { id: 'config', label: 'Configurações', icon: <Settings className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />, adminOnly: true },
    { id: 'images', label: 'Imagens', icon: <ImageIcon className={cn("h-4 w-4", isCollapsed && "h-5 w-5")} />, adminOnly: true },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.adminOnly) return true;
    return role === 'admin' || role === 'gestor';
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
      <div className={cn("border-b border-border", isCollapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between mb-4")}>
          {!isCollapsed ? (
            <h2 className="text-lg font-bold">
              Painel <span className="bg-gradient-gold bg-clip-text text-transparent">
                {role === 'admin' ? 'Admin' : 'Gestor'}
              </span>
            </h2>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all",
                      isCollapsed && "absolute -right-3 top-6 bg-card border border-border shadow-md rounded-full"
                    )}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">{isCollapsed ? 'Maximizar menu' : 'Minimizar menu'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <nav className={cn("flex-1 space-y-2 overflow-y-auto", isCollapsed ? "p-2" : "p-4")}>
        <TooltipProvider delayDuration={100}>
          {filteredMenuItems.map((item) => {
            const isActive = activeTab === item.id;
            const button = (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-left transition-all duration-200 hover:bg-secondary/50 hover:text-primary",
                  isCollapsed
                    ? cn(
                        "w-12 h-12 mx-auto justify-center px-0 py-0",
                        isActive
                          ? "bg-primary/10 text-primary border-l-0 border-b-2 border-primary font-semibold"
                          : "text-muted-foreground"
                      )
                    : cn(
                        "w-full px-4 py-3",
                        isActive
                          ? "bg-primary/10 text-primary border-l-4 border-primary font-semibold"
                          : "text-muted-foreground"
                      )
                )}
              >
                {item.icon}
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );

            if (isCollapsed && !isMobile) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-sm font-medium">{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }
            return button;
          })}
        </TooltipProvider>
      </nav>

      {/* User Info and Logout */}
      <div className={cn("border-t border-border space-y-2", isCollapsed ? "p-2" : "p-4")}>
        {user && !isCollapsed && (
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
        {user && isCollapsed && !isMobile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold mb-2 cursor-default">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-sm font-medium">{role === 'admin' ? 'Administrador' : 'Gestor'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {!isCollapsed ? (
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
        ) : !isMobile ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }} 
                  variant="ghost"
                  size="icon"
                  className="w-12 h-12 mx-auto flex justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-sm font-medium">Sair</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
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
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className="fixed top-4 left-4 z-50 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0"
          aria-labelledby="admin-sidebar-title"
          aria-describedby="admin-sidebar-desc"
        >
          <SheetHeader className="sr-only">
            <SheetTitle id="admin-sidebar-title">Menu do Painel</SheetTitle>
            <SheetDescription id="admin-sidebar-desc">Navegação administrativa</SheetDescription>
          </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <aside className={cn(
      "hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 bg-card border-r border-border transition-all duration-300 ease-in-out",
      isCollapsed ? "md:w-16" : "md:w-64"
    )}>
      <SidebarContent />
    </aside>
  );
};
