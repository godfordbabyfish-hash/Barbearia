import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, Scissors } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoRaimundos from '@/assets/logo-raimundos.png';
import { formatCPF, cleanCPF, validateCPF } from '@/utils/cpfValidation';

const Auth = () => {
  const [authLogo, setAuthLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    email: '',
    password: '',
  });
  const [clientCPF, setClientCPF] = useState('');
  const { signIn, signInWithCPF, user, role } = useAuth();
  const navigate = useNavigate();

  // Carregar CPF salvo do localStorage ao montar o componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCPF = localStorage.getItem('lastClientCPF');
        if (savedCPF) {
          // Formatar o CPF salvo antes de exibir
          const formatted = formatCPF(savedCPF);
          setClientCPF(formatted);
        }
      } catch (e) {
        console.warn('Não foi possível carregar CPF do localStorage:', e);
      }
    }
  }, []);

  // Carregar email salvo do localStorage ao montar o componente (para aba de barbeiro)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedEmail = localStorage.getItem('lastBarberEmail');
        if (savedEmail) {
          setFormData(prev => ({ ...prev, email: savedEmail }));
        }
      } catch (e) {
        console.warn('Não foi possível carregar email do localStorage:', e);
      }
    }
  }, []);

  // Load auth logo from database
  useEffect(() => {
    const loadAuthLogo = async () => {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'auth_logo')
        .maybeSingle();
      
      // Ignorar erro 406 (Not Acceptable) ou PGRST116 (not found)
      if (error && error.code !== 'PGRST116') {
        console.warn('Error loading auth logo:', error);
      }
      
      if (data?.config_value && typeof data.config_value === 'object' && 'image_url' in data.config_value) {
        setAuthLogo((data.config_value as { image_url: string }).image_url);
      }
    };
    loadAuthLogo();
  }, []);

  // Redirecionar após autenticação
  useEffect(() => {
    if (user && role) {
      // Cada tipo de usuário vai para seu próprio painel
      const path = 
        role === 'admin' || role === 'gestor' ? '/admin' : 
        role === 'barbeiro' ? '/barbeiro' : 
        '/cliente';
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

  // Format CPF as user types
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = cleanCPF(value);
    
    // Limita a 11 dígitos
    if (cleaned.length <= 11) {
      const formatted = formatCPF(cleaned);
      setClientCPF(formatted);
    }
  };

  const handleClientAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validar CPF
    const cpfValidation = validateCPF(clientCPF);
    if (!cpfValidation.isValid) {
      toast.error(cpfValidation.errorMessage || 'CPF inválido');
      setIsLoading(false);
      return;
    }

    const result = await signInWithCPF(clientCPF);

    if (result.error) {
      toast.error('Erro ao acessar', { description: result.error.message });
    } else {
      toast.success('Login realizado com sucesso!');
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
                Digite seu CPF para acessar
              </p>
              
              <form onSubmit={handleClientAccess} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-cpf">CPF *</Label>
                  <Input
                    id="client-cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={clientCPF}
                    onChange={handleCPFChange}
                    maxLength={14}
                    required
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite apenas os números do seu CPF
                  </p>
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
                    'Entrar'
                  )}
                </Button>
              </form>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Link to="/cadastro" className="text-primary hover:underline font-medium">
                    Cadastre-se
                  </Link>
                </p>
              </div>
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
