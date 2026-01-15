import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Shield, Scissors } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoRaimundos from '@/assets/logo-raimundos.png';

const Auth = () => {
  const [authLogo, setAuthLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    email: '',
    password: '',
  });
  const [clientFormData, setClientFormData] = useState({ name: '', phone: '' });
  const { signIn, signInOrSignUp, user, role } = useAuth();
  const navigate = useNavigate();

  // Load auth logo from database
  useEffect(() => {
    const loadAuthLogo = async () => {
      const { data } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'auth_logo')
        .single();
      
      if (data?.config_value && typeof data.config_value === 'object' && 'image_url' in data.config_value) {
        setAuthLogo((data.config_value as { image_url: string }).image_url);
      }
    };
    loadAuthLogo();
  }, []);

  // Redirecionar após autenticação
  useEffect(() => {
    if (user && role) {
      const path = role === 'admin' ? '/admin' : role === 'barbeiro' ? '/barbeiro' : '/cliente';
      navigate(path, { replace: true });
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signIn(formData.email, formData.password);

    if (result.error) {
      toast.error('Erro ao acessar', {
        description: result.error.message,
      });
    } else {
      toast.success('Login realizado!');
    }

    setIsLoading(false);
  };

  const handleClientAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signInOrSignUp(clientFormData.name, clientFormData.phone);

    if (result.error) {
      toast.error('Erro ao acessar', { description: result.error.message });
    } else {
      toast.success('Acesso realizado com sucesso!');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background gap-4">
      <Card className="w-full max-w-lg shadow-elegant">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <img 
              src={authLogo || logoRaimundos} 
              alt="Logo da Barbearia" 
              className="h-20 w-20 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso ao Sistema</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="cliente" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="cliente">Cliente</TabsTrigger>
              <TabsTrigger value="barbeiros">Barbeiros</TabsTrigger>
            </TabsList>

            {/* Tab Cliente */}
            <TabsContent value="cliente" className="space-y-6">
              <p className="text-center text-muted-foreground text-sm">
                Você só precisa preencher estes dados uma vez
              </p>
              
              <form onSubmit={handleClientAccess} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefone *</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder="(82) 98221-2126"
                    value={clientFormData.phone}
                    onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-name">Seu nome *</Label>
                  <Input
                    id="client-name"
                    placeholder="Digite seu nome"
                    value={clientFormData.name}
                    onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'CONFIRMAR'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Tab Barbeiros */}
            <TabsContent value="barbeiros" className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              <div className="pt-4 border-t border-border text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Primeiro acesso ao sistema?
                </p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/admin-setup')}
                  className="text-primary"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Configurar Usuário Admin
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Button 
        variant="outline"
        onClick={() => navigate('/fila')}
        className="w-full max-w-lg h-12 text-base font-medium border-primary text-primary hover:bg-primary hover:text-primary-foreground"
      >
        <Scissors className="mr-2 h-5 w-5" />
        Ver Fila da Barbearia
      </Button>
    </div>
  );
};

export default Auth;
