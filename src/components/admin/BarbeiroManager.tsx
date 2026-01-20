import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Barber {
  id: string;
  name: string;
  user_id?: string;
  whatsapp_phone?: string | null;
}

export const BarbeiroManager = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [showNewBarberDialog, setShowNewBarberDialog] = useState(false);
  const [newBarber, setNewBarber] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    whatsapp_phone: '',
    specialty: '',
    experience: '',
  });

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    const { data } = await (supabase as any)
      .from('barbers')
      .select('*')
      .order('order_index');
    
    if (data) setBarbers(data);
  };

  const handleCreateBarber = async () => {
    if (!newBarber.name || !newBarber.email || !newBarber.password || !newBarber.specialty || !newBarber.experience) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newBarber.email,
        password: newBarber.password,
        options: {
          data: {
            name: newBarber.name,
            phone: newBarber.phone || '',
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Criar profile
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: newBarber.name,
          phone: newBarber.phone || '',
        });

      if (profileError) throw profileError;

      // Criar role de barbeiro
      const { error: roleError } = await (supabase as any)
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role: 'barbeiro'
        }]);

      if (roleError) throw roleError;

      // Criar barber com todos os dados
      const { error: barberError } = await (supabase as any)
        .from('barbers')
        .insert([{
          name: newBarber.name,
          user_id: authData.user.id,
          specialty: newBarber.specialty,
          experience: newBarber.experience,
          rating: 5.0,
          visible: true,
          whatsapp_phone: newBarber.whatsapp_phone || null,
          order_index: barbers.length,
        }]);

      if (barberError) throw barberError;

      toast.success('Barbeiro criado com sucesso! Login, senha e WhatsApp configurados.');
      setShowNewBarberDialog(false);
      setNewBarber({ name: '', email: '', password: '', phone: '', whatsapp_phone: '', specialty: '', experience: '' });
      loadBarbers();
    } catch (error: any) {
      toast.error('Erro ao criar barbeiro: ' + error.message);
    }
  };

  const handleDeleteBarber = async (id: string) => {
    const { error } = await (supabase as any)
      .from('barbers')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir barbeiro');
    } else {
      toast.success('Barbeiro excluído!');
      loadBarbers();
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={showNewBarberDialog} onOpenChange={setShowNewBarberDialog}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Criar Novo Barbeiro
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Barbeiro com Acesso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={newBarber.name}
                onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })}
                placeholder="João Silva"
                required
              />
            </div>
            <div>
              <Label>Email de Acesso *</Label>
              <Input
                type="email"
                value={newBarber.email}
                onChange={(e) => setNewBarber({ ...newBarber, email: e.target.value })}
                placeholder="joao@barbearia.com"
                required
              />
            </div>
            <div>
              <Label>Senha de Acesso *</Label>
              <Input
                type="password"
                value={newBarber.password}
                onChange={(e) => setNewBarber({ ...newBarber, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                type="tel"
                value={newBarber.phone}
                onChange={(e) => setNewBarber({ ...newBarber, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>WhatsApp do Barbeiro (opcional)</Label>
              <Input
                type="tel"
                value={newBarber.whatsapp_phone}
                onChange={(e) => setNewBarber({ ...newBarber, whatsapp_phone: e.target.value })}
                placeholder="Ex: 5582999999999"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use apenas números. Exemplo: 5582982212126 (55 + DDD + número).
              </p>
            </div>
            <div>
              <Label>Especialidade *</Label>
              <Input
                value={newBarber.specialty}
                onChange={(e) => setNewBarber({ ...newBarber, specialty: e.target.value })}
                placeholder="Ex: Cortes modernos, Barbas"
                required
              />
            </div>
            <div>
              <Label>Experiência *</Label>
              <Input
                value={newBarber.experience}
                onChange={(e) => setNewBarber({ ...newBarber, experience: e.target.value })}
                placeholder="Ex: 5 anos de experiência"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateBarber} className="flex-1">
                Criar Barbeiro Completo
              </Button>
              <Button variant="outline" onClick={() => setShowNewBarberDialog(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {barbers.map((barber) => (
          <Card key={barber.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{barber.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {barber.user_id ? 'Acesso configurado' : 'Sem acesso ao sistema'}
                    </p>
                    <p className="text-xs mt-1">
                      WhatsApp:{' '}
                      {barber.whatsapp_phone
                        ? <span className="text-emerald-500 font-medium">{barber.whatsapp_phone}</span>
                        : <span className="text-muted-foreground">não configurado</span>}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => handleDeleteBarber(barber.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};