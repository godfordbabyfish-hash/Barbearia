import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ArrowLeft, Upload, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import FinancialDashboard from '@/components/FinancialDashboard';
import SiteConfigEditor from '@/components/admin/SiteConfigEditor';
import ImageManager from '@/components/admin/ImageManager';
import OperatingHoursEditor from '@/components/admin/OperatingHoursEditor';
import { BarbeiroManager } from '@/components/admin/BarbeiroManager';
import { UserManager } from '@/components/admin/UserManager';
import { WhatsAppManager } from '@/components/admin/WhatsAppManager';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('services');
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [clearingAppointments, setClearingAppointments] = useState(false);

  // Troca de senha do próprio admin/gestor
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const handleClearAllAppointments = async () => {
    setClearingAppointments(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      toast.success('Todos os registros de agendamentos foram limpos!', {
        description: 'O histórico foi completamente removido.',
      });
    } catch (error: any) {
      toast.error('Erro ao limpar agendamentos', {
        description: error.message,
      });
    } finally {
      setClearingAppointments(false);
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Preencha a nova senha e a confirmação.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success('Senha atualizada com sucesso!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error('Erro ao atualizar senha', {
        description: error.message,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      // Allow access for admin and gestor roles
      if (!user || (role !== 'admin' && role !== 'gestor')) {
        navigate('/auth');
        toast.error('Acesso negado', {
          description: 'Você precisa ser um administrador ou gestor para acessar esta página.',
        });
      } else {
        loadData();
      }
    }
  }, [user, role, loading, navigate]);

  const loadData = async () => {
    const { data: servicesData } = await (supabase as any)
      .from('services')
      .select('*')
      .order('order_index');
    
    const { data: barbersData } = await (supabase as any)
      .from('barbers')
      .select('*')
      .order('order_index');

    const { data: productsData } = await (supabase as any)
      .from('products')
      .select('*')
      .order('order_index');

    if (servicesData) setServices(servicesData);
    if (barbersData) setBarbers(barbersData);
    if (productsData) setProducts(productsData);
  };

  const handleImageUpload = async (file: File, path: string) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('site-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-images')
        .getPublicUrl(fileName);

      setUploading(false);
      return publicUrl;
    } catch (error: any) {
      setUploading(false);
      toast.error('Erro ao fazer upload: ' + error.message);
      return null;
    }
  };

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingService) return;

    const url = await handleImageUpload(file, 'services');
    if (url) {
      setEditingService({ ...editingService, image_url: url });
      toast.success('Imagem carregada!');
    }
  };

  const handleBarberImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBarber) return;

    const url = await handleImageUpload(file, 'barbers');
    if (url) {
      setEditingBarber({ ...editingBarber, image_url: url });
      toast.success('Imagem carregada!');
    }
  };

  const handleSaveService = async () => {
    if (!editingService) return;

    const { error } = editingService.id 
      ? await (supabase as any)
          .from('services')
          .update({
            title: editingService.title,
            description: editingService.description,
            price: editingService.price,
            icon: editingService.icon,
            visible: editingService.visible,
            image_url: editingService.image_url,
            duration: editingService.duration || 30,
          })
          .eq('id', editingService.id)
      : await (supabase as any)
          .from('services')
          .insert([{
            title: editingService.title,
            description: editingService.description,
            price: editingService.price,
            icon: editingService.icon,
            visible: editingService.visible,
            image_url: editingService.image_url,
            duration: editingService.duration || 30,
            order_index: services.length,
          }]);

    if (error) {
      toast.error('Erro ao salvar serviço');
    } else {
      toast.success('Serviço salvo com sucesso!');
      setEditingService(null);
      loadData();
    }
  };

  const handleDeleteService = async (id: string) => {
    const { error } = await (supabase as any)
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir serviço');
    } else {
      toast.success('Serviço excluído!');
      loadData();
    }
  };

  const handleSaveBarber = async () => {
    if (!editingBarber) return;

    const { error } = editingBarber.id
      ? await (supabase as any)
          .from('barbers')
          .update({
            name: editingBarber.name,
            specialty: editingBarber.specialty,
            experience: editingBarber.experience,
            rating: editingBarber.rating,
            visible: editingBarber.visible,
            image_url: editingBarber.image_url,
            whatsapp_phone: editingBarber.whatsapp_phone || null,
          })
          .eq('id', editingBarber.id)
      : await (supabase as any)
          .from('barbers')
          .insert([{
            name: editingBarber.name,
            specialty: editingBarber.specialty,
            experience: editingBarber.experience,
            rating: editingBarber.rating,
            visible: editingBarber.visible,
            image_url: editingBarber.image_url,
            whatsapp_phone: editingBarber.whatsapp_phone || null,
            order_index: barbers.length,
          }]);

    if (error) {
      toast.error('Erro ao salvar barbeiro');
    } else {
      toast.success('Barbeiro salvo com sucesso!');
      setEditingBarber(null);
      loadData();
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
      loadData();
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    const url = await handleImageUpload(file, 'products');
    if (url) {
      setEditingProduct({ ...editingProduct, image_url: url });
      toast.success('Imagem carregada!');
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    const { error } = editingProduct.id
      ? await (supabase as any)
          .from('products')
          .update({
            name: editingProduct.name,
            description: editingProduct.description,
            price: editingProduct.price,
            category: editingProduct.category,
            stock: editingProduct.stock,
            visible: editingProduct.visible,
            image_url: editingProduct.image_url,
          })
          .eq('id', editingProduct.id)
      : await (supabase as any)
          .from('products')
          .insert([{
            name: editingProduct.name,
            description: editingProduct.description,
            price: editingProduct.price,
            category: editingProduct.category,
            stock: editingProduct.stock,
            visible: editingProduct.visible,
            image_url: editingProduct.image_url,
            order_index: products.length,
          }]);

    if (error) {
      toast.error('Erro ao salvar produto');
    } else {
      toast.success('Produto salvo com sucesso!');
      setEditingProduct(null);
      loadData();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await (supabase as any)
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir produto');
    } else {
      toast.success('Produto excluído!');
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (role !== 'admin' && role !== 'gestor')) {
    return null;
  }

  if (!role || (role !== 'admin' && role !== 'gestor')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        role={role as 'admin' | 'gestor'}
      />

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        <div className="py-4 md:py-8 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Content based on active tab */}
            {activeTab === 'services' && (
              <div className="space-y-4">
            <Button onClick={() => setEditingService({ title: '', description: '', price: 0, icon: 'Scissors', visible: true, image_url: '', duration: 30 })}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>

            {editingService && (
              <Card className="bg-card border-primary/50">
                <CardHeader>
                  <CardTitle>{editingService.id ? 'Editar' : 'Novo'} Serviço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={editingService.title}
                      onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={editingService.description}
                      onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingService.price}
                      onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Ícone (lucide-react)</Label>
                    <Input
                      value={editingService.icon}
                      onChange={(e) => setEditingService({ ...editingService, icon: e.target.value })}
                      placeholder="Scissors, Wind, Sparkles..."
                    />
                  </div>
                  <div>
                    <Label>Duração (minutos)</Label>
                    <Input
                      type="number"
                      value={editingService.duration || 30}
                      onChange={(e) => setEditingService({ ...editingService, duration: parseInt(e.target.value) })}
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <Label>Imagem do Serviço</Label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleServiceImageUpload}
                        disabled={uploading}
                        className="flex-1"
                      />
                      {editingService.image_url && (
                        <img src={editingService.image_url} alt="Preview" className="h-16 w-16 object-cover rounded flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingService.visible}
                      onCheckedChange={(checked) => setEditingService({ ...editingService, visible: checked })}
                    />
                    <Label>Visível</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveService} disabled={uploading}>Salvar</Button>
                    <Button variant="outline" onClick={() => setEditingService(null)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {services.map((service) => (
                <Card key={service.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex gap-4 flex-1">
                        {service.image_url && (
                          <img src={service.image_url} alt={service.title} className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold">{service.title}</h3>
                          <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">{service.description}</p>
                          <p className="text-primary font-bold mt-2">R$ {service.price}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Ícone: {service.icon} | {service.visible ? 'Visível' : 'Oculto'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 self-start sm:self-auto">
                        <Button size="sm" variant="outline" onClick={() => setEditingService(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteService(service.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
              </div>
            )}

            {activeTab === 'barbeiros' && (
              <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Gestão de Barbeiros</CardTitle>
              </CardHeader>
              <CardContent>
                <BarbeiroManager />
              </CardContent>
            </Card>
            
            <div className="space-y-4 mt-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h3 className="text-xl sm:text-2xl font-bold">Perfil dos Barbeiros</h3>
                <Button onClick={() => setEditingBarber({ name: '', specialty: '', experience: '', rating: 5.0, visible: true, image_url: '' })} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Perfil de Barbeiro
                </Button>
              </div>

              {editingBarber && (
                <Card className="bg-card border-primary/50">
                  <CardHeader>
                    <CardTitle>{editingBarber.id ? 'Editar' : 'Novo'} Perfil de Barbeiro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={editingBarber.name}
                        onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Especialidade</Label>
                      <Input
                        value={editingBarber.specialty}
                        onChange={(e) => setEditingBarber({ ...editingBarber, specialty: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Experiência</Label>
                      <Input
                        value={editingBarber.experience}
                        onChange={(e) => setEditingBarber({ ...editingBarber, experience: e.target.value })}
                        placeholder="8 anos"
                      />
                    </div>
                    <div>
                      <Label>WhatsApp do Barbeiro (opcional)</Label>
                      <Input
                        type="tel"
                        value={editingBarber.whatsapp_phone || ''}
                        onChange={(e) => setEditingBarber({ ...editingBarber, whatsapp_phone: e.target.value })}
                        placeholder="Ex: 5582999999999"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use apenas números. Exemplo: 5582982212126 (55 + DDD + número).
                      </p>
                    </div>
                    <div>
                      <Label>Avaliação (0-5)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={editingBarber.rating}
                        onChange={(e) => setEditingBarber({ ...editingBarber, rating: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Foto do Barbeiro</Label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleBarberImageUpload}
                          disabled={uploading}
                          className="flex-1"
                        />
                        {editingBarber.image_url && (
                          <img src={editingBarber.image_url} alt="Preview" className="h-16 w-16 object-cover rounded-full flex-shrink-0" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingBarber.visible}
                        onCheckedChange={(checked) => setEditingBarber({ ...editingBarber, visible: checked })}
                      />
                      <Label>Visível</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveBarber} disabled={uploading}>Salvar</Button>
                      <Button variant="outline" onClick={() => setEditingBarber(null)}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {barbers.map((barber) => (
                  <Card key={barber.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex gap-4 flex-1">
                          {barber.image_url && (
                            <img src={barber.image_url} alt={barber.name} className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-full flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold">{barber.name}</h3>
                            <p className="text-sm sm:text-base text-muted-foreground">{barber.specialty}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                              {barber.experience} de experiência | ⭐ {barber.rating}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {barber.visible ? 'Visível' : 'Oculto'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 self-start sm:self-auto">
                          <Button size="sm" variant="outline" onClick={() => setEditingBarber(barber)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteBarber(barber.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4">
            <Button onClick={() => setEditingProduct({ name: '', description: '', price: 0, category: 'Styling', stock: 0, visible: true, image_url: '' })}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>

            {editingProduct && (
              <Card className="bg-card border-primary/50">
                <CardHeader>
                  <CardTitle>{editingProduct.id ? 'Editar' : 'Novo'} Produto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Estoque</Label>
                      <Input
                        type="number"
                        value={editingProduct.stock || 0}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Input
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      placeholder="Styling, Ferramentas, Barba, Cuidados"
                    />
                  </div>
                  <div>
                    <Label>Imagem do Produto</Label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        disabled={uploading}
                        className="flex-1"
                      />
                      {editingProduct.image_url && (
                        <img src={editingProduct.image_url} alt="Preview" className="h-16 w-16 object-cover rounded flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingProduct.visible}
                      onCheckedChange={(checked) => setEditingProduct({ ...editingProduct, visible: checked })}
                    />
                    <Label>Visível</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProduct} disabled={uploading}>Salvar</Button>
                    <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex gap-4 flex-1">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold">{product.name}</h3>
                          <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">{product.description}</p>
                          <p className="text-primary font-bold mt-2">R$ {product.price}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Categoria: {product.category} | Estoque: {product.stock} | {product.visible ? 'Visível' : 'Oculto'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 self-start sm:self-auto">
                        <Button size="sm" variant="outline" onClick={() => setEditingProduct(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="space-y-4">
                <FinancialDashboard />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4">
            {/* Minha conta - troca de senha do próprio admin/gestor */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Minha Conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nova senha</Label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar nova senha</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>
                <div className="flex justify-start">
                  <Button
                    onClick={handleChangeOwnPassword}
                    disabled={changingPassword}
                  >
                    {changingPassword && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Atualizar minha senha
                  </Button>
                </div>
              </CardContent>
            </Card>

            <OperatingHoursEditor />
            <SiteConfigEditor />
            
            {/* Card de Manutenção de Dados */}
            <Card className="bg-card border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Manutenção de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Use esta opção com cuidado. A exclusão de registros é <strong>permanente e irreversível</strong>.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={clearingAppointments}>
                      {clearingAppointments ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Limpar Todos os Agendamentos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Tem certeza absoluta?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          Esta ação é <strong className="text-destructive">irreversível</strong> e irá remover <strong>TODOS</strong> os registros de agendamentos do sistema:
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                          <li>Agendamentos pendentes</li>
                          <li>Agendamentos confirmados</li>
                          <li>Agendamentos concluídos</li>
                          <li>Agendamentos cancelados</li>
                        </ul>
                        <p className="mt-2 font-semibold">
                          Todos os dados financeiros relacionados também serão perdidos.
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearAllAppointments}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Sim, limpar tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="space-y-4">
                <ImageManager />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                <UserManager />
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="space-y-4">
                <WhatsAppManager />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;