import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadPublicImage } from '@/utils/storage';

interface ImageItem {
  id: string;
  label: string;
  path: string;
  currentUrl: string | null;
  category: 'hero' | 'services' | 'barbers' | 'products' | 'logo';
}

const ImageManager = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllImages();
  }, []);

  const loadAllImages = async () => {
    setLoading(true);
    const imageList: ImageItem[] = [];

    // Load Hero Image
    const { data: heroData } = await (supabase as any)
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'hero_section')
      .single();

    if (heroData?.config_value?.image_url) {
      imageList.push({
        id: 'hero_main',
        label: 'Imagem Principal do Hero',
        path: 'hero_section.image_url',
        currentUrl: heroData.config_value.image_url,
        category: 'hero',
      });
    }

    // Load Auth Logo
    const { data: authLogoData } = await (supabase as any)
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'auth_logo')
      .single();

    imageList.push({
      id: 'auth_logo',
      label: 'Logo da Página de Autenticação',
      path: 'auth_logo.image_url',
      currentUrl: authLogoData?.config_value?.image_url || null,
      category: 'logo',
    });

    // Load Services Images
    const { data: servicesData } = await (supabase as any)
      .from('services')
      .select('*')
      .order('order_index');

    servicesData?.forEach((service: any) => {
      imageList.push({
        id: `service_${service.id}`,
        label: `Imagem do Serviço: ${service.title}`,
        path: `services.${service.id}.image_url`,
        currentUrl: service.image_url,
        category: 'services',
      });
    });

    // Load Barbers Images
    const { data: barbersData } = await (supabase as any)
      .from('barbers')
      .select('*')
      .order('order_index');

    barbersData?.forEach((barber: any) => {
      imageList.push({
        id: `barber_${barber.id}`,
        label: `Foto do Barbeiro: ${barber.name}`,
        path: `barbers.${barber.id}.image_url`,
        currentUrl: barber.image_url,
        category: 'barbers',
      });
    });

    // Load Products Images
    const { data: productsData } = await (supabase as any)
      .from('products')
      .select('*')
      .order('order_index');

    productsData?.forEach((product: any) => {
      imageList.push({
        id: `product_${product.id}`,
        label: `Imagem do Produto: ${product.name}`,
        path: `products.${product.id}.image_url`,
        currentUrl: product.image_url,
        category: 'products',
      });
    });

    setImages(imageList);
    setLoading(false);
  };

  const handleImageUpload = async (imageItem: ImageItem, file: File) => {
    setUploading(imageItem.id);
    try {
      const publicUrl = await uploadPublicImage(file, { bucket: 'site-images', category: imageItem.category });

      // Update database based on category
      if (imageItem.category === 'hero') {
        const { data: currentData } = await (supabase as any)
          .from('site_config')
          .select('config_value')
          .eq('config_key', 'hero_section')
          .single();

        await (supabase as any)
          .from('site_config')
          .upsert({
            config_key: 'hero_section',
            config_value: {
              ...currentData.config_value,
              image_url: publicUrl,
            },
          }, { onConflict: 'config_key' });
      } else if (imageItem.category === 'services') {
        const serviceId = imageItem.id.replace('service_', '');
        await (supabase as any)
          .from('services')
          .update({ image_url: publicUrl })
          .eq('id', serviceId);
      } else if (imageItem.category === 'barbers') {
        const barberId = imageItem.id.replace('barber_', '');
        await (supabase as any)
          .from('barbers')
          .update({ image_url: publicUrl })
          .eq('id', barberId);
      } else if (imageItem.category === 'products') {
        const productId = imageItem.id.replace('product_', '');
        await (supabase as any)
          .from('products')
          .update({ image_url: publicUrl })
          .eq('id', productId);
      } else if (imageItem.category === 'logo' && imageItem.id === 'auth_logo') {
        await (supabase as any)
          .from('site_config')
          .upsert({
            config_key: 'auth_logo',
            config_value: { image_url: publicUrl },
          }, { onConflict: 'config_key' });
      }

      toast.success('Imagem atualizada com sucesso!');
      loadAllImages();
    } catch (error: any) {
      toast.error('Erro ao fazer upload: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      hero: 'Hero',
      services: 'Serviços',
      barbers: 'Barbeiros',
      products: 'Produtos',
      logo: 'Logo',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group images by category
  const imagesByCategory = images.reduce((acc, img) => {
    if (!acc[img.category]) {
      acc[img.category] = [];
    }
    acc[img.category].push(img);
    return acc;
  }, {} as Record<string, ImageItem[]>);

  return (
    <div className="space-y-8">
      {Object.entries(imagesByCategory).map(([category, categoryImages]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-2xl font-bold border-b border-border pb-2">
            {getCategoryLabel(category)}
          </h3>
          <div className="grid gap-4">
            {categoryImages.map((imageItem) => (
          <Card key={imageItem.id} className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{imageItem.label}</span>
                <span className="text-sm text-muted-foreground font-normal">
                  {getCategoryLabel(imageItem.category)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {imageItem.currentUrl && (
                  <div className="w-32 h-32 flex-shrink-0">
                    <img 
                      src={imageItem.currentUrl} 
                      alt={imageItem.label}
                      className="w-full h-full object-cover rounded border border-border"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`upload-${imageItem.id}`}>
                    Escolher nova imagem
                  </Label>
                  <Input
                    id={`upload-${imageItem.id}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(imageItem, file);
                    }}
                    disabled={uploading === imageItem.id}
                  />
                  {uploading === imageItem.id && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ImageManager;
