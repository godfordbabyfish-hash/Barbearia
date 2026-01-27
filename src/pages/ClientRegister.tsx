import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { validateCPF, formatCPF, cleanCPF } from '@/utils/cpfValidation';
import { validateBrazilianPhone } from '@/utils/phoneValidation';
import logoRaimundos from '@/assets/logo-raimundos.png';

const ClientRegister = () => {
  const [authLogo, setAuthLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    whatsapp: '',
    birthDate: '',
  });
  const { signUpWithCPF, user, role } = useAuth();
  const navigate = useNavigate();

  // Load auth logo from database
  useEffect(() => {
    const loadAuthLogo = async () => {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'auth_logo')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Error loading auth logo:', error);
      }
      
      if (data?.config_value && typeof data.config_value === 'object' && 'image_url' in data.config_value) {
        setAuthLogo((data.config_value as { image_url: string }).image_url);
      }
    };
    loadAuthLogo();
  }, []);

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user && role) {
      const path = 
        role === 'admin' || role === 'gestor' ? '/admin' : 
        role === 'barbeiro' ? '/barbeiro' : 
        '/cliente';
      navigate(path, { replace: true });
    }
  }, [user, role, navigate]);

  // Format CPF as user types
  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = cleanCPF(value);
    
    // Limita a 11 dígitos
    if (cleaned.length <= 11) {
      const formatted = formatCPF(cleaned);
      setFormData({ ...formData, cpf: formatted });
    }
  };

  // Format WhatsApp as user types (only numbers, limit to 10)
  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ ...formData, whatsapp: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validações
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      setIsLoading(false);
      return;
    }

    const cpfValidation = validateCPF(formData.cpf);
    if (!cpfValidation.isValid) {
      toast.error(cpfValidation.errorMessage || 'CPF inválido');
      setIsLoading(false);
      return;
    }

    const whatsappValidation = validateBrazilianPhone(formData.whatsapp);
    if (!whatsappValidation.isValid) {
      toast.error(whatsappValidation.errorMessage || 'WhatsApp inválido');
      setIsLoading(false);
      return;
    }

    if (!formData.birthDate) {
      toast.error('Data de nascimento é obrigatória');
      setIsLoading(false);
      return;
    }

    // Verificar se CPF já está cadastrado
    const cleanedCPF = cleanCPF(formData.cpf);
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('cpf', cleanedCPF)
      .maybeSingle();

    if (existingProfile) {
      toast.error('Este CPF já está cadastrado. Faça login com seu CPF.');
      setIsLoading(false);
      return;
    }

    // Criar conta
    const result = await signUpWithCPF(
      cleanedCPF,
      formData.name.trim(),
      formData.whatsapp,
      formData.birthDate
    );

    if (result.error) {
      toast.error('Erro ao criar conta', {
        description: result.error.message,
      });
    } else {
      toast.success('Cadastro realizado com sucesso!');
      // Redirecionamento será feito automaticamente pelo useEffect
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
          <CardTitle className="text-2xl font-bold">Cadastro de Cliente</CardTitle>
          <CardDescription>
            Preencha seus dados para criar sua conta
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Digite seu nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={handleCPFChange}
                maxLength={14}
                required
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Digite apenas os números do seu CPF
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="8200000000"
                value={formData.whatsapp}
                onChange={handleWhatsAppChange}
                maxLength={10}
                required
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Formato: DDD (2 dígitos) + número (8 dígitos, sem o 9). Exemplo: 8200000000
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento *</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                required
                className="h-12"
                max={new Date().toISOString().split('T')[0]} // Não permite data futura
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
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/auth" className="text-primary hover:underline font-medium">
                  Faça login
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        onClick={() => navigate('/auth')}
        className="mt-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para login
      </Button>
    </div>
  );
};

export default ClientRegister;
