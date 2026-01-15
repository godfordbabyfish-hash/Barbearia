import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/contexts/AuthContext';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [clearingAppointments, setClearingAppointments] = useState(false);

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

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            Painel <span className="bg-gradient-gold bg-clip-text text-transparent">Admin</span>
          </h1>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Site
          </Button>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="services">Serviços</TabsTrigger>
            <TabsTrigger value="barbeiros">Barbeiros</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="space-y-4">
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
                    <div className="flex gap-2 items-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleServiceImageUpload}
                        disabled={uploading}
                      />
                      {editingService.image_url && (
                        <img src={editingService.image_url} alt="Preview" className="h-16 w-16 object-cover rounded" />
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
                    <div className="flex justify-between items-start gap-4">
                      {service.image_url && (
                        <img src={service.image_url} alt={service.title} className="h-24 w-24 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{service.title}</h3>
                        <p className="text-muted-foreground">{service.description}</p>
                        <p className="text-primary font-bold mt-2">R$ {service.price}</p>
                        <p className="text-sm text-muted-foreground">
                          Ícone: {service.icon} | {service.visible ? 'Visível' : 'Oculto'}
                        </p>
                      </div>
                      <div className="flex gap-2">
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
          </TabsContent>

          <TabsContent value="barbeiros" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Gestão de Barbeiros</CardTitle>
              </CardHeader>
              <CardContent>
                <BarbeiroManager />
              </CardContent>
            </Card>
            
            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Perfil dos Barbeiros</h3>
                <Button onClick={() => setEditingBarber({ name: '', specialty: '', experience: '', rating: 5.0, visible: true, image_url: '' })}>
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
                      <div className="flex gap-2 items-center">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleBarberImageUpload}
                          disabled={uploading}
                        />
                        {editingBarber.image_url && (
                          <img src={editingBarber.image_url} alt="Preview" className="h-16 w-16 object-cover rounded-full" />
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
                      <div className="flex justify-between items-start gap-4">
                        {barber.image_url && (
                          <img src={barber.image_url} alt={barber.name} className="h-24 w-24 object-cover rounded-full" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{barber.name}</h3>
                          <p className="text-muted-foreground">{barber.specialty}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {barber.experience} de experiência | ⭐ {barber.rating}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {barber.visible ? 'Visível' : 'Oculto'}
                          </p>
                        </div>
                        <div className="flex gap-2">
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
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
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
                  <div className="grid md:grid-cols-2 gap-4">
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
                    <div className="flex gap-2 items-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        disabled={uploading}
                      />
                      {editingProduct.image_url && (
                        <img src={editingProduct.image_url} alt="Preview" className="h-16 w-16 object-cover rounded" />
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
                    <div className="flex justify-between items-start gap-4">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="h-24 w-24 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        <p className="text-muted-foreground">{product.description}</p>
                        <p className="text-primary font-bold mt-2">R$ {product.price}</p>
                        <p className="text-sm text-muted-foreground">
                          Categoria: {product.category} | Estoque: {product.stock} | {product.visible ? 'Visível' : 'Oculto'}
                        </p>
                      </div>
                      <div className="flex gap-2">
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
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <FinancialDashboard />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <ImageManager />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;