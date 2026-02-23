import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Palette, MapPin } from 'lucide-react';

const hslToHex = (hsl: string): string => {
  try {
    const parts = hsl.trim().split(/\s+/);
    if (parts.length < 3) return '#000000';
    const h = Math.max(0, Math.min(360, parseFloat(parts[0])));
    const s = Math.max(0, Math.min(100, parseFloat(parts[1].replace('%', '')))) / 100;
    const l = Math.max(0, Math.min(100, parseFloat(parts[2].replace('%', '')))) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h >= 0 && h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h >= 60 && h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h >= 120 && h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h >= 180 && h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h >= 240 && h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }
    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return '#000000';
  }
};

const hexToHsl = (hex: string): string => {
  try {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return '0 0% 0%';
  }
};

const defaultThemeColors = {
  primary: '45 100% 60%',
  primary_foreground: '0 0% 5%',
  secondary: '0 0% 12%',
  background: '0 0% 5%',
  foreground: '0 0% 98%',
  sectionTitlePrimary: '0 0% 98%',
  sectionTitleAccent: '45 100% 60%',
};

const defaultHeroSection = {
  title: '',
  subtitle: '',
  description: '',
};

const defaultFooterInfo = {
  address: '',
  maps_link: '',
  phone: '',
  email: '',
  hours: '',
  hoursWeekday: '9h-20h',
  hoursSaturday: '9h-18h',
  social: {
    instagram: '',
    facebook: '',
    whatsapp: '',
    google_reviews: '',
  },
  wifi: {
    username: '',
    password: '',
  },
};

const SiteConfigEditor = () => {
  const [themeColors, setThemeColors] = useState(defaultThemeColors);

  const [heroSection, setHeroSection] = useState(defaultHeroSection);

  const [footerInfo, setFooterInfo] = useState(defaultFooterInfo);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    // Load theme colors
    const { data: themeData } = await (supabase as any)
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'theme_colors')
      .single();

    if (themeData) {
      setThemeColors({
        ...defaultThemeColors,
        ...(themeData.config_value || {}),
      });
    }

    // Load hero section
    const { data: heroData } = await (supabase as any)
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'hero_section')
      .single();

    if (heroData) {
      const { image_url, ...heroContent } = heroData.config_value || {};
      setHeroSection({
        ...defaultHeroSection,
        ...(heroContent || {}),
      });
    }

    // Load footer info
    const { data: footerData } = await (supabase as any)
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .single();

    if (footerData) {
      const config = footerData.config_value || {};
      setFooterInfo({
        ...defaultFooterInfo,
        ...config,
        social: {
          ...defaultFooterInfo.social,
          ...(config.social || {}),
        },
        wifi: {
          ...defaultFooterInfo.wifi,
          ...(config.wifi || {}),
        },
      });
    }
  };

  const saveThemeColors = async () => {
    const { error } = await (supabase as any)
      .from('site_config')
      .upsert({
        config_key: 'theme_colors',
        config_value: themeColors,
      }, { onConflict: 'config_key' });

    if (error) {
      toast.error('Erro ao salvar cores');
    } else {
      // Update CSS variables
      const root = document.documentElement;
      root.style.setProperty('--primary', themeColors.primary);
      root.style.setProperty('--primary-foreground', themeColors.primary_foreground);
      root.style.setProperty('--secondary', themeColors.secondary);
      root.style.setProperty('--background', themeColors.background);
      root.style.setProperty('--foreground', themeColors.foreground);
      root.style.setProperty('--section-title-primary', themeColors.sectionTitlePrimary);
      root.style.setProperty('--section-title-accent', themeColors.sectionTitleAccent);
      
      toast.success('Cores salvas e aplicadas!');
    }
  };

  const saveHeroSection = async () => {
    // Get current hero data to preserve image_url
    const { data: currentData } = await (supabase as any)
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'hero_section')
      .single();

    const { error } = await (supabase as any)
      .from('site_config')
      .upsert({
        config_key: 'hero_section',
        config_value: {
          ...heroSection,
          image_url: currentData?.config_value?.image_url || null,
        },
      }, { onConflict: 'config_key' });

    if (error) {
      toast.error('Erro ao salvar Hero');
    } else {
      toast.success('Hero salvo!');
    }
  };

  const saveFooterInfo = async () => {
    const { error } = await (supabase as any)
      .from('site_config')
      .upsert({
        config_key: 'footer_info',
        config_value: footerInfo,
      }, { onConflict: 'config_key' });

    if (error) {
      toast.error('Erro ao salvar Footer');
    } else {
      toast.success('Footer salvo!');
    }
  };


  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Theme Colors */}
      <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
            Cores do Tema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={hslToHex(themeColors.primary ?? '')}
                    onChange={(e) => setThemeColors({ ...themeColors, primary: hexToHsl(e.target.value) })}
                    className="w-14 h-10 p-1"
                  />
                  <Input value={`hsl(${themeColors.primary})`} disabled className="flex-1" />
                </div>
                <div 
                  className="mt-2 h-8 sm:h-10 rounded border"
                  style={{ backgroundColor: `hsl(${themeColors.primary})` }}
                />
              </div>
              <div>
                <Label className="text-sm">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={hslToHex(themeColors.secondary ?? '')}
                    onChange={(e) => setThemeColors({ ...themeColors, secondary: hexToHsl(e.target.value) })}
                    className="w-14 h-10 p-1"
                  />
                  <Input value={`hsl(${themeColors.secondary})`} disabled className="flex-1" />
                </div>
                <div 
                  className="mt-2 h-8 sm:h-10 rounded border"
                  style={{ backgroundColor: `hsl(${themeColors.secondary})` }}
                />
              </div>
              <div>
                <Label className="text-sm">Cor de Fundo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={hslToHex(themeColors.background ?? '')}
                    onChange={(e) => setThemeColors({ ...themeColors, background: hexToHsl(e.target.value) })}
                    className="w-14 h-10 p-1"
                  />
                  <Input value={`hsl(${themeColors.background})`} disabled className="flex-1" />
                </div>
                <div 
                  className="mt-2 h-8 sm:h-10 rounded border"
                  style={{ backgroundColor: `hsl(${themeColors.background})` }}
                />
              </div>
              <div>
                <Label className="text-sm">Cor de Texto</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={hslToHex(themeColors.foreground ?? '')}
                    onChange={(e) => setThemeColors({ ...themeColors, foreground: hexToHsl(e.target.value) })}
                    className="w-14 h-10 p-1"
                  />
                  <Input value={`hsl(${themeColors.foreground})`} disabled className="flex-1" />
                </div>
                <div 
                  className="mt-2 h-8 sm:h-10 rounded border"
                  style={{ backgroundColor: `hsl(${themeColors.foreground})` }}
                />
              </div>
              <div>
                <Label className="text-sm">Cor Principal dos Títulos</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={hslToHex(themeColors.sectionTitlePrimary ?? '')}
                    onChange={(e) => setThemeColors({ ...themeColors, sectionTitlePrimary: hexToHsl(e.target.value) })}
                    className="w-14 h-10 p-1"
                  />
                  <Input value={`hsl(${themeColors.sectionTitlePrimary})`} disabled className="flex-1" />
                </div>
                <div 
                  className="mt-2 h-8 sm:h-10 rounded border"
                  style={{ backgroundColor: `hsl(${themeColors.sectionTitlePrimary})` }}
                />
              </div>
              <div>
                <Label className="text-sm">Cor de Destaque dos Títulos</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={hslToHex(themeColors.sectionTitleAccent ?? '')}
                    onChange={(e) => setThemeColors({ ...themeColors, sectionTitleAccent: hexToHsl(e.target.value) })}
                    className="w-14 h-10 p-1"
                  />
                  <Input value={`hsl(${themeColors.sectionTitleAccent})`} disabled className="flex-1" />
                </div>
                <div 
                  className="mt-2 h-8 sm:h-10 rounded border"
                  style={{ backgroundColor: `hsl(${themeColors.sectionTitleAccent})` }}
                />
              </div>
            </div>
            <Button onClick={saveThemeColors} className="w-full sm:w-auto">Salvar Cores</Button>
          </div>
        </CardContent>
      </Card>

      {/* Hero Section */}
      <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-lg sm:text-xl">Seção Hero (Topo da Página)</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-sm">Título Principal</Label>
              <Input
                value={heroSection.title ?? ''}
                onChange={(e) => setHeroSection({ ...heroSection, title: e.target.value })}
                placeholder="Estilo & Elegância"
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm">Subtítulo</Label>
              <Input
                value={heroSection.subtitle ?? ''}
                onChange={(e) => setHeroSection({ ...heroSection, subtitle: e.target.value })}
                placeholder="Tradição em cada corte"
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm">Descrição</Label>
              <Textarea
                value={heroSection.description ?? ''}
                onChange={(e) => setHeroSection({ ...heroSection, description: e.target.value })}
                placeholder="Descrição completa..."
                rows={3}
                className="w-full"
              />
            </div>
            <Button onClick={saveHeroSection} className="w-full sm:w-auto">Salvar Hero</Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-lg sm:text-xl">Informações do Footer</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <Label className="text-sm">Endereço Físico (Para Exibição)</Label>
                <Input
                  value={footerInfo.address}
                  onChange={(e) => setFooterInfo({ ...footerInfo, address: e.target.value })}
                  placeholder="Ex: Av. Ver. Dário Marsiglia, 267 - Tabuleiro do Martins, Maceió - AL"
                  className="mt-1 w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este endereço será exibido para os clientes no checkout e no footer do site.
                </p>
              </div>
              
              <div>
                <Label className="text-sm">Link do Google Maps</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={footerInfo.maps_link || ''}
                    onChange={(e) => setFooterInfo({ ...footerInfo, maps_link: e.target.value })}
                    placeholder="https://maps.app.goo.gl/99FAhyYC18ey9xTF9"
                    className="flex-1 mt-1 w-full"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const linkToOpen = footerInfo.maps_link || footerInfo.address;
                      if (!linkToOpen) return;
                      
                      if (linkToOpen.includes('http://') || linkToOpen.includes('https://')) {
                        window.open(linkToOpen, '_blank');
                      } else {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(linkToOpen)}`;
                        window.open(mapsUrl, '_blank');
                      }
                    }}
                    disabled={!footerInfo.maps_link && !footerInfo.address}
                    className="w-full sm:w-auto flex-shrink-0"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Testar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cole aqui o link do Google Maps. Quando o cliente clicar no endereço, este link será aberto.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm">Telefone</Label>
                <Input
                  value={footerInfo.phone}
                  onChange={(e) => setFooterInfo({ ...footerInfo, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input
                  value={footerInfo.email}
                  onChange={(e) => setFooterInfo({ ...footerInfo, email: e.target.value })}
                  placeholder="contato@barbearia.com"
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold">Horário de Funcionamento</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Segunda a Sexta</Label>
                  <Input
                    value={footerInfo.hoursWeekday || ''}
                    onChange={(e) => setFooterInfo({ ...footerInfo, hoursWeekday: e.target.value })}
                    placeholder="9h-20h"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Sábado</Label>
                  <Input
                    value={footerInfo.hoursSaturday || ''}
                    onChange={(e) => setFooterInfo({ ...footerInfo, hoursSaturday: e.target.value })}
                    placeholder="9h-18h"
                    className="w-full"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Exibido no footer como: Seg-Sex: {footerInfo.hoursWeekday || '9h-20h'} | Sáb: {footerInfo.hoursSaturday || '9h-18h'}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Redes Sociais</Label>
              <Input
                value={footerInfo.social.instagram}
                onChange={(e) => setFooterInfo({ 
                  ...footerInfo, 
                  social: { ...footerInfo.social, instagram: e.target.value }
                })}
                placeholder="https://instagram.com/..."
                className="w-full"
              />
              <Input
                value={footerInfo.social.facebook}
                onChange={(e) => setFooterInfo({ 
                  ...footerInfo, 
                  social: { ...footerInfo.social, facebook: e.target.value }
                })}
                placeholder="https://facebook.com/..."
                className="w-full"
              />
              <Input
                value={footerInfo.social.whatsapp}
                onChange={(e) => setFooterInfo({ 
                  ...footerInfo, 
                  social: { ...footerInfo.social, whatsapp: e.target.value }
                })}
                placeholder="5511999999999"
                className="w-full"
              />
              <Input
                value={footerInfo.social.google_reviews || ''}
                onChange={(e) => setFooterInfo({ 
                  ...footerInfo, 
                  social: { ...footerInfo.social, google_reviews: e.target.value }
                })}
                placeholder="https://g.page/r/.../review ou link do Google Reviews"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">WiFi - Credenciais para Clientes</Label>
              <Input
                value={footerInfo.wifi?.username || ''}
                onChange={(e) => setFooterInfo({ 
                  ...footerInfo, 
                  wifi: { ...footerInfo.wifi, username: e.target.value }
                })}
                placeholder="Nome da rede WiFi"
                className="w-full"
              />
              <Input
                type="password"
                value={footerInfo.wifi?.password || ''}
                onChange={(e) => setFooterInfo({ 
                  ...footerInfo, 
                  wifi: { ...footerInfo.wifi, password: e.target.value }
                })}
                placeholder="Senha da rede WiFi"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Essas credenciais serão exibidas quando o cliente clicar no ícone WiFi
              </p>
            </div>
            <Button onClick={saveFooterInfo} className="w-full sm:w-auto">Salvar Footer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteConfigEditor;
