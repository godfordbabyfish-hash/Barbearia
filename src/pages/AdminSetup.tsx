import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import logoRaimundos from '@/assets/logo-raimundos.png';

const AdminSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const createAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Criar usuário admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'admin@admin.com',
        password: '1823108',
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: {
            name: 'Administrador',
          }
        }
      });

      if (authError) {
        toast.error('Erro ao criar admin', {
          description: authError.message,
        });
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuário');
        setIsLoading(false);
        return;
      }

      // Criar perfil
      await (supabase as any)
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: 'Administrador',
          phone: null,
        });

      // Atribuir role admin
      const { error: roleError } = await (supabase as any)
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin'
        });

      if (roleError) {
        toast.error('Erro ao atribuir role admin', {
          description: roleError.message,
        });
        setIsLoading(false);
        return;
      }

      toast.success('Usuário admin criado com sucesso!', {
        description: 'Email: admin@admin.com | Senha: 1823108',
      });

      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      toast.error('Erro ao configurar admin', {
        description: error.message,
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-card border-border shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={logoRaimundos} 
              alt="Raimundos Barbearia" 
              className="h-24 w-24 object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold">
            <span className="bg-gradient-gold bg-clip-text text-transparent">Setup Inicial</span>
          </CardTitle>
          <CardDescription>
            Configure o usuário administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createAdminUser} className="space-y-4">
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Credenciais do Admin</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Email:</span> admin@admin.com</p>
                <p><span className="font-medium">Senha:</span> 1823108</p>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando Admin...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Criar Usuário Admin
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={() => navigate('/auth')}
              className="text-sm"
            >
              Voltar para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetup;
