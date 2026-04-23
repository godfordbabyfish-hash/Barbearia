import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, ArrowLeft, Upload, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import BarberAdvancesManager from '@/components/admin/BarberAdvancesManager';
import HistoricoCP from '@/components/admin/HistoricoCP';
import SiteConfigEditor from '@/components/admin/SiteConfigEditor';
import ImageManager from '@/components/admin/ImageManager';
import OperatingHoursEditor from '@/components/admin/OperatingHoursEditor';
import { UserManager } from '@/components/admin/UserManager';
import { uploadPublicImage } from '@/utils/storage';
import { WhatsAppManager } from '@/components/admin/WhatsAppManager';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import FilaDaBarbearia from '@/pages/FilaDaBarbearia';

const EGRESs_INCLUDED_GB_FREE_PLAN = 5;
const EGRESS_TARGET_DAILY_MB = 160;
const BILLING_PERIOD_DAYS = 30;
const EGRESS_SNAPSHOT_CONFIG_KEY = 'supabase_cached_egress_snapshot';
const EGRESS_SCHEDULE_CONFIG_KEY = 'supabase_usage_sync_schedule';
const DEFAULT_EGRESS_SCHEDULE_TIME = '06:15';
const EGRESS_WHATSAPP_CONFIG_KEY = 'whatsapp_egress_report';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('services-products');
  const [servicesProductsTab, setServicesProductsTab] = useState<'services' | 'products'>('services');
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [clearingAppointments, setClearingAppointments] = useState(false);

  // Troca de senha do próprio admin/gestor
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [egressUsedGbInput, setEgressUsedGbInput] = useState<string>('5.05');
  const [egressDaysElapsedInput, setEgressDaysElapsedInput] = useState<string>('22');
  const [syncingEgress, setSyncingEgress] = useState(false);
  const [egressLastSyncedAt, setEgressLastSyncedAt] = useState<string | null>(null);
  const [egressScheduleTime, setEgressScheduleTime] = useState<string>(DEFAULT_EGRESS_SCHEDULE_TIME);
  const [savingEgressSchedule, setSavingEgressSchedule] = useState(false);
  const [egressWhatsappEnabled, setEgressWhatsappEnabled] = useState(false);
  const [egressWhatsappPhone, setEgressWhatsappPhone] = useState('');
  const [savingEgressWhatsappConfig, setSavingEgressWhatsappConfig] = useState(false);
  const [testingEgressWhatsapp, setTestingEgressWhatsapp] = useState(false);

  const parseLocalizedNumber = (value: string) => {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const loadEgressWhatsappConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', EGRESS_WHATSAPP_CONFIG_KEY)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar config de WhatsApp do egress:', error);
        return;
      }

      const cfg = (data?.config_value as any) || {};
      setEgressWhatsappEnabled(Boolean(cfg.enabled));
      setEgressWhatsappPhone(typeof cfg.phone_number === 'string' ? cfg.phone_number : '');
    } catch (error) {
      console.error('Erro inesperado ao carregar config de WhatsApp do egress:', error);
    }
  };

  const handleTestEgressWhatsappReport = async () => {
    setTestingEgressWhatsapp(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-supabase-usage', {
        body: { force: true, send_whatsapp: true },
      });

      if (error) {
        throw new Error(error.message || 'Falha ao testar envio de egress');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao testar envio de egress');
      }

      if (data?.snapshot) {
        applyEgressSnapshot(data.snapshot);
      }

      if (data?.whatsapp_report_sent) {
        toast.success('Teste enviado no WhatsApp de egress.');
      } else {
        toast.error('Teste não enviado', {
          description:
            data?.whatsapp_report_error || 'Verifique se o envio está habilitado e o número foi configurado.',
        });
      }
    } catch (error: any) {
      toast.error('Erro ao testar envio de egress', {
        description: error?.message || 'Não foi possível testar agora.',
      });
    } finally {
      setTestingEgressWhatsapp(false);
    }
  };

  const handleSaveEgressWhatsappConfig = async () => {
    const normalizedPhone = egressWhatsappPhone.replace(/\D/g, '');

    if (egressWhatsappEnabled && !normalizedPhone) {
      toast.error('Informe o número de WhatsApp para envio do report de egress.');
      return;
    }

    setSavingEgressWhatsappConfig(true);
    try {
      const payload = {
        enabled: egressWhatsappEnabled,
        phone_number: normalizedPhone,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('site_config')
        .upsert(
          {
            config_key: EGRESS_WHATSAPP_CONFIG_KEY,
            config_value: payload as any,
          },
          { onConflict: 'config_key' }
        );

      if (error) {
        throw new Error(error.message || 'Falha ao salvar config de WhatsApp do egress');
      }

      setEgressWhatsappPhone(normalizedPhone);
      toast.success('Configuração de WhatsApp do egress salva.');
    } catch (error: any) {
      toast.error('Erro ao salvar WhatsApp do egress', {
        description: error?.message || 'Não foi possível salvar agora.',
      });
    } finally {
      setSavingEgressWhatsappConfig(false);
    }
  };

  const loadEgressSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', EGRESS_SCHEDULE_CONFIG_KEY)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar horário do sync de egress:', error);
        return;
      }

      const scheduleConfig = (data?.config_value as any) || {};
      const configuredTime = typeof scheduleConfig.time === 'string'
        ? scheduleConfig.time
        : null;

      if (configuredTime && /^([01]\d|2[0-3]):([0-5]\d)$/.test(configuredTime)) {
        setEgressScheduleTime(configuredTime);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar horário do sync de egress:', error);
    }
  };

  const handleSaveEgressSchedule = async () => {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(egressScheduleTime)) {
      toast.error('Horário inválido', {
        description: 'Use o formato HH:MM (24h).',
      });
      return;
    }

    setSavingEgressSchedule(true);
    try {
      const { error } = await (supabase as any).rpc('set_sync_supabase_usage_schedule', {
        p_time: egressScheduleTime,
      });

      if (error) {
        throw new Error(error.message || 'Falha ao atualizar horário do cron');
      }

      toast.success('Horário do sync automático atualizado.');
      await loadEgressSchedule();
    } catch (error: any) {
      toast.error('Erro ao salvar horário do sync', {
        description: error?.message || 'Não foi possível salvar agora.',
      });
    } finally {
      setSavingEgressSchedule(false);
    }
  };

  const egressEstimate = useMemo(() => {
    const usedGb = Math.max(0, parseLocalizedNumber(egressUsedGbInput));
    const daysElapsed = Math.max(0, Number.parseInt(egressDaysElapsedInput || '0', 10) || 0);
    const dailyMb = daysElapsed > 0 ? (usedGb * 1024) / daysElapsed : 0;
    const projectedMonthlyGb = (dailyMb * BILLING_PERIOD_DAYS) / 1024;
    const reductionNeededPct =
      dailyMb > EGRESS_TARGET_DAILY_MB
        ? ((dailyMb - EGRESS_TARGET_DAILY_MB) / dailyMb) * 100
        : 0;

    const remainingGb = Math.max(0, EGRESs_INCLUDED_GB_FREE_PLAN - usedGb);
    const remainingDays = Math.max(0, BILLING_PERIOD_DAYS - daysElapsed);
    const safeDailyFromNowMb = remainingDays > 0 ? (remainingGb * 1024) / remainingDays : 0;

    return {
      usedGb,
      daysElapsed,
      dailyMb,
      projectedMonthlyGb,
      reductionNeededPct,
      remainingGb,
      remainingDays,
      safeDailyFromNowMb,
      isAboveTarget: dailyMb > EGRESS_TARGET_DAILY_MB,
      willExceedPlan: projectedMonthlyGb > EGRESs_INCLUDED_GB_FREE_PLAN,
    };
  }, [egressDaysElapsedInput, egressUsedGbInput]);

  const applyEgressSnapshot = (configValue: any) => {
    const usedGb = Number(configValue?.used_gb);
    const daysElapsed = Number(configValue?.days_elapsed);
    const updatedAt = typeof configValue?.updated_at === 'string' ? configValue.updated_at : null;

    if (Number.isFinite(usedGb) && usedGb >= 0) {
      setEgressUsedGbInput(usedGb.toFixed(2));
    }

    if (Number.isFinite(daysElapsed) && daysElapsed > 0) {
      setEgressDaysElapsedInput(String(Math.round(daysElapsed)));
    }

    setEgressLastSyncedAt(updatedAt);
  };

  const loadEgressSnapshot = async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', EGRESS_SNAPSHOT_CONFIG_KEY)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar snapshot de egress:', error);
        return;
      }

      if (!data?.config_value) {
        return;
      }

      applyEgressSnapshot(data.config_value as any);
    } catch (error) {
      console.error('Erro inesperado ao carregar egress snapshot:', error);
    }
  };

  const handleSyncEgressFromSupabase = async () => {
    setSyncingEgress(true);
    try {
      // Se o usuário editou o campo manualmente, envia para salvar
      const manualUsedGb = parseFloat(String(egressUsedGbInput).replace(',', '.'));
      const hasManualValue = Number.isFinite(manualUsedGb) && manualUsedGb >= 0;

      const body: Record<string, unknown> = { force: true };
      if (hasManualValue) {
        body.manual_used_gb = manualUsedGb;
      }

      const { data, error } = await supabase.functions.invoke('sync-supabase-usage', {
        body,
      });

      if (error) {
        throw new Error(error.message || 'Falha ao sincronizar com Supabase');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao sincronizar com Supabase');
      }

      if (data?.snapshot) {
        applyEgressSnapshot(data.snapshot);
      } else {
        await loadEgressSnapshot();
      }

      const sourceLabel =
        data?.source === 'manual'
          ? 'Valor manual salvo.'
          : data?.source === 'analytics_logs'
            ? 'Uso atualizado (estimativa via logs).'
            : 'Usando snapshot em cache (Dashboard > Organization > Usage para valor real).';
      toast.success(sourceLabel);
    } catch (error: any) {
      toast.error('Erro ao sincronizar uso', {
        description: error?.message || 'Não foi possível sincronizar agora.',
      });
    } finally {
      setSyncingEgress(false);
    }
  };

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
        loadEgressSnapshot();
        loadEgressSchedule();
        loadEgressWhatsappConfig();
      }
    }
  }, [user, role, loading, navigate]);

  const normalizeServiceOrder = async () => {
    const { data, error } = await (supabase as any)
      .from('services')
      .select('id, title, description, price, icon, visible, image_url, duration, order_index')
      .order('order_index', { ascending: true, nullsLast: true });
    if (error || !data) {
      console.error('Error loading services for normalize:', error);
      return;
    }

    const sorted = [...data].sort((a: any, b: any) => {
      const ao = typeof a.order_index === 'number' ? a.order_index : 9999;
      const bo = typeof b.order_index === 'number' ? b.order_index : 9999;
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });

    for (let index = 0; index < sorted.length; index++) {
      const s = sorted[index];
      const newIndex = index + 1;
      if (s.order_index === newIndex) continue;
      const { error: updateError } = await (supabase as any)
        .from('services')
        .update({
          title: s.title,
          description: s.description,
          price: s.price,
          icon: s.icon,
          visible: s.visible,
          image_url: s.image_url,
          duration: s.duration,
          order_index: newIndex,
        })
        .eq('id', s.id);
      if (updateError) {
        console.error('Error normalizing service order:', updateError);
        break;
      }
    }
  };

  const normalizeProductOrder = async () => {
    const { data, error } = await (supabase as any)
      .from('products')
      .select('id, name, description, price, category, stock, visible, image_url, order_index')
      .order('order_index', { ascending: true, nullsLast: true });
    if (error || !data) {
      console.error('Error loading products for normalize:', error);
      return;
    }

    const sorted = [...data].sort((a: any, b: any) => {
      const ao = typeof a.order_index === 'number' ? a.order_index : 9999;
      const bo = typeof b.order_index === 'number' ? b.order_index : 9999;
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });

    for (let index = 0; index < sorted.length; index++) {
      const p = sorted[index];
      const newIndex = index + 1;
      if (p.order_index === newIndex) continue;
      const { error: updateError } = await (supabase as any)
        .from('products')
        .update({
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          stock: p.stock,
          visible: p.visible,
          image_url: p.image_url,
          order_index: newIndex,
        })
        .eq('id', p.id);
      if (updateError) {
        console.error('Error normalizing product order:', updateError);
        break;
      }
    }
  };

  const loadData = async () => {
    let { data: servicesData } = await (supabase as any)
      .from('services')
      .select('*')
      .order('order_index');

    let { data: productsData } = await (supabase as any)
      .from('products')
      .select('*')
      .order('order_index');

    if (servicesData && servicesData.length > 0) {
      const seenServices = new Set<number>();
      let servicesHaveIssues = false;
      for (const s of servicesData) {
        if (s.order_index == null || seenServices.has(s.order_index)) {
          servicesHaveIssues = true;
          break;
        }
        seenServices.add(s.order_index);
      }
      if (servicesHaveIssues) {
        await normalizeServiceOrder();
        const refreshed = await (supabase as any)
          .from('services')
          .select('*')
          .order('order_index');
        if (!refreshed.error && refreshed.data) {
          servicesData = refreshed.data;
        }
      }
    }

    if (productsData && productsData.length > 0) {
      const seen = new Set<number>();
      let hasIssues = false;
      for (const p of productsData) {
        if (p.order_index == null || seen.has(p.order_index)) {
          hasIssues = true;
          break;
        }
        seen.add(p.order_index);
      }
      if (hasIssues) {
        await normalizeProductOrder();
        const refreshed = await (supabase as any)
          .from('products')
          .select('*')
          .order('order_index');
        if (!refreshed.error && refreshed.data) {
          productsData = refreshed.data;
        }
      }
    }

    if (servicesData) setServices(servicesData);
    if (productsData) setProducts(productsData || []);
  };

  const handleImageUpload = async (file: File, path: string) => {
    setUploading(true);
    try {
      const url = await uploadPublicImage(file, { bucket: 'site-images', category: path });
      setUploading(false);
      return url;
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

  const reorderServices = async (movedServiceId: string, desiredIndex: number | null) => {
    const { data, error } = await (supabase as any)
      .from('services')
      .select('id, title, description, price, icon, visible, image_url, duration, order_index')
      .order('order_index', { ascending: true, nullsLast: true });
    if (error || !data) {
      console.error('Error loading services for reorder:', error);
      return;
    }

    const total = data.length;
    const targetIndex = desiredIndex && desiredIndex > 0 ? desiredIndex : total;
    const moved = data.find((s: any) => s.id === movedServiceId);
    if (!moved) return;
    const others = data.filter((s: any) => s.id !== movedServiceId);
    const sortedOthers = others.sort((a: any, b: any) => {
      const ao = typeof a.order_index === 'number' ? a.order_index : 9999;
      const bo = typeof b.order_index === 'number' ? b.order_index : 9999;
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });

    const newList = [...sortedOthers];
    const idx = Math.max(0, Math.min(targetIndex - 1, newList.length));
    newList.splice(idx, 0, moved);

    for (let index = 0; index < newList.length; index++) {
      const s = newList[index];
      const newIndex = index + 1;
      if (s.order_index === newIndex) continue;
      const { error: updateError } = await (supabase as any)
        .from('services')
        .update({
          title: s.title,
          description: s.description,
          price: s.price,
          icon: s.icon,
          visible: s.visible,
          image_url: s.image_url,
          duration: s.duration,
          order_index: newIndex,
        })
        .eq('id', s.id);
      if (updateError) {
        console.error('Error reordering services:', updateError);
        break;
      }
    }
  };

  const handleSaveService = async () => {
    if (!editingService) return;

    const parsedOrderIndex =
      typeof editingService.order_index === 'number'
        ? editingService.order_index
        : editingService.order_index
        ? parseInt(editingService.order_index, 10)
        : null;

    let error = null as any;
    let movedServiceId: string | null = null;

    if (editingService.id) {
      movedServiceId = editingService.id;
      const result = await (supabase as any)
        .from('services')
        .update({
          title: editingService.title,
          description: editingService.description,
          price: editingService.price,
          icon: editingService.icon,
          visible: editingService.visible,
          image_url: editingService.image_url,
          duration: editingService.duration || 30,
          order_index: parsedOrderIndex,
        })
        .eq('id', editingService.id);
      error = result.error;
    } else {
      const result = await (supabase as any)
        .from('services')
        .insert([{
          title: editingService.title,
          description: editingService.description,
          price: editingService.price,
          icon: editingService.icon,
          visible: editingService.visible,
          image_url: editingService.image_url,
          duration: editingService.duration || 30,
          order_index: parsedOrderIndex ?? services.length + 1,
        }])
        .select('id')
        .maybeSingle();
      error = result.error;
      movedServiceId = result.data?.id ?? null;
    }

    if (error) {
      toast.error('Erro ao salvar serviço');
      return;
    }

    if (movedServiceId) {
      await reorderServices(movedServiceId, parsedOrderIndex);
    }

    toast.success('Serviço salvo com sucesso!');
    setEditingService(null);
    loadData();
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


  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    const url = await handleImageUpload(file, 'products');
    if (url) {
      setEditingProduct({ ...editingProduct, image_url: url });
      toast.success('Imagem carregada!');
    }
  };

  const reorderProducts = async (movedProductId: string, desiredIndex: number | null) => {
    const { data, error } = await (supabase as any)
      .from('products')
      .select('id, name, description, price, category, stock, visible, image_url, order_index')
      .order('order_index', { ascending: true, nullsLast: true });
    if (error || !data) {
      console.error('Error loading products for reorder:', error);
      return;
    }
    const total = data.length;
    const targetIndex = desiredIndex && desiredIndex > 0 ? desiredIndex : total;
    const moved = data.find((p: any) => p.id === movedProductId);
    if (!moved) return;
    const others = data.filter((p: any) => p.id !== movedProductId);
    const sortedOthers = others.sort((a: any, b: any) => {
      const ao = typeof a.order_index === 'number' ? a.order_index : 9999;
      const bo = typeof b.order_index === 'number' ? b.order_index : 9999;
      if (ao !== bo) return ao - bo;
      return String(a.id).localeCompare(String(b.id));
    });
    const newList = [...sortedOthers];
    const idx = Math.max(0, Math.min(targetIndex - 1, newList.length));
    newList.splice(idx, 0, moved);

    for (let index = 0; index < newList.length; index++) {
      const p = newList[index];
      const newIndex = index + 1;
      if (p.order_index === newIndex) continue;
      const { error: updateError } = await (supabase as any)
        .from('products')
        .update({
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category,
          stock: p.stock,
          visible: p.visible,
          image_url: p.image_url,
          order_index: newIndex,
        })
        .eq('id', p.id);
      if (updateError) {
        console.error('Error reordering products:', updateError);
        break;
      }
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;

    const parsedOrderIndex =
      typeof editingProduct.order_index === 'number'
        ? editingProduct.order_index
        : editingProduct.order_index
        ? parseInt(editingProduct.order_index, 10)
        : null;

    let error = null as any;
    let movedProductId: string | null = null;

    if (editingProduct.id) {
      movedProductId = editingProduct.id;
      const result = await (supabase as any)
        .from('products')
        .update({
          name: editingProduct.name,
          description: editingProduct.description,
          price: editingProduct.price,
          category: editingProduct.category,
          stock: editingProduct.stock,
          visible: editingProduct.visible,
          image_url: editingProduct.image_url,
          order_index: parsedOrderIndex,
        })
        .eq('id', editingProduct.id);
      error = result.error;
    } else {
      const result = await (supabase as any)
        .from('products')
        .insert([{
          name: editingProduct.name,
          description: editingProduct.description,
          price: editingProduct.price,
          category: editingProduct.category,
          stock: editingProduct.stock,
          visible: editingProduct.visible,
          image_url: editingProduct.image_url,
          order_index: parsedOrderIndex ?? products.length,
        }])
        .select('id')
        .maybeSingle();
      error = result.error;
      movedProductId = result.data?.id ?? null;
    }

    if (error) {
      toast.error('Erro ao salvar produto');
      return;
    }

    if (movedProductId) {
      await reorderProducts(movedProductId, parsedOrderIndex);
    }

    toast.success('Produto salvo com sucesso!');
    setEditingProduct(null);
    loadData();
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
      <main className="flex-1 lg:pl-64 bg-background overflow-x-hidden">
        <div className="min-h-screen py-4 sm:py-6 px-2 sm:px-4 md:px-6 lg:px-8 pt-20 lg:pt-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full overflow-x-hidden">
            {/* Content based on active tab */}
            {activeTab === 'services-products' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full">
                  <h2 className="text-xl sm:text-2xl font-bold pl-12 lg:pl-0">Serviços & Produtos</h2>
                </div>

                <Tabs value={servicesProductsTab} onValueChange={(value) => setServicesProductsTab(value as 'services' | 'products')} className="w-full" style={{ maxWidth: '100%' }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="services" className="text-xs sm:text-sm">Serviços</TabsTrigger>
                    <TabsTrigger value="products" className="text-xs sm:text-sm">Produtos</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="services" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                editingService?.id === service.id ? (
                  // Formulário de edição inline
                  <Card key={service.id} className="bg-card border-border shadow-lg border-primary">
                    <CardHeader>
                      <CardTitle className="text-xl">Editar Serviço</CardTitle>
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
                        <Label>Ordem no Site</Label>
                        <Input
                          type="number"
                          min={1}
                          value={editingService.order_index ?? ''}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              order_index: e.target.value === '' ? null : parseInt(e.target.value, 10),
                            })
                          }
                          placeholder="1, 2, 3..."
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
                          value={editingService.duration || ''}
                          onChange={(e) => setEditingService({ 
                            ...editingService, 
                            duration: e.target.value === '' ? null : parseInt(e.target.value) || null
                          })}
                          placeholder="30"
                          min="1"
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
                ) : (
                  // Card normal do serviço
                  <Card key={service.id} className="bg-card border-border hover:border-primary/50 transition-all">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {service.image_url && (
                          <img src={service.image_url} alt={service.title} className="w-full h-32 object-cover rounded-lg" />
                        )}
                        <div>
                          <h3 className="text-lg font-bold mb-1">{service.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{service.description}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-primary">R$ {service.price.toFixed(2)}</p>
                            <Badge variant={service.visible ? 'default' : 'secondary'}>
                              {service.visible ? 'Visível' : 'Oculto'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Duração: {service.duration || 30}min • Ordem: {service.order_index ?? '-'}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingService(service)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteService(service.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
              {/* Formulário para novo serviço ou card para adicionar */}
              {editingService && !editingService.id ? (
                <Card className="bg-card border-border shadow-lg border-primary">
                  <CardHeader>
                    <CardTitle className="text-xl">Novo Serviço</CardTitle>
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
                      <Label>Ordem no Site</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editingService.order_index ?? ''}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            order_index: e.target.value === '' ? null : parseInt(e.target.value, 10),
                          })
                        }
                        placeholder="1, 2, 3..."
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
                        value={editingService.duration || ''}
                        onChange={(e) => setEditingService({ 
                          ...editingService, 
                          duration: e.target.value === '' ? null : parseInt(e.target.value) || null
                        })}
                        placeholder="30"
                        min="1"
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
              ) : !editingService ? (
                <Card className="bg-card border-border border-dashed hover:border-primary/50 transition-all">
                  <CardContent className="p-4 flex items-center justify-center min-h-[200px]">
                    <Button 
                      variant="ghost" 
                      className="w-full h-full flex flex-col gap-2"
                      onClick={() => setEditingService({ title: '', description: '', price: 0, icon: 'Scissors', visible: true, image_url: '', duration: 30, order_index: services.length + 1 })}
                    >
                      <Plus className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">Novo Serviço</span>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="products" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                editingProduct?.id === product.id ? (
                  // Formulário de edição inline
                  <Card key={product.id} className="bg-card border-border shadow-lg border-primary">
                    <CardHeader>
                      <CardTitle className="text-xl">Editar Produto</CardTitle>
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
                        <Label>Ordem no Shop</Label>
                        <Input
                          type="number"
                          min={1}
                          value={editingProduct.order_index ?? ''}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              order_index: e.target.value === '' ? null : parseInt(e.target.value, 10),
                            })
                          }
                          placeholder="1, 2, 3..."
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
                ) : (
                  // Card normal do produto
                  <Card key={product.id} className="bg-card border-border hover:border-primary/50 transition-all">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover rounded-lg" />
                        )}
                        <div>
                          <h3 className="text-lg font-bold mb-1">{product.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-lg font-bold text-primary">R$ {Number(product.price).toFixed(2)}</p>
                            <Badge variant={product.visible ? 'default' : 'secondary'}>
                              {product.visible ? 'Visível' : 'Oculto'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{product.category}</span>
                            <span>•</span>
                            <span>Estoque: {product.stock}</span>
                            <span>•</span>
                            <span>Ordem: {product.order_index ?? '-'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingProduct(product)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
              {/* Formulário para novo produto ou card para adicionar */}
              {editingProduct && !editingProduct.id ? (
                <Card className="bg-card border-border shadow-lg border-primary">
                  <CardHeader>
                    <CardTitle className="text-xl">Novo Produto</CardTitle>
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
                      <Label>Ordem no Shop</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editingProduct.order_index ?? products.length + 1}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            order_index: e.target.value === '' ? null : parseInt(e.target.value, 10),
                          })
                        }
                        placeholder="1, 2, 3..."
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
              ) : !editingProduct ? (
                <Card className="bg-card border-border border-dashed hover:border-primary/50 transition-all">
                  <CardContent className="p-4 flex items-center justify-center min-h-[200px]">
                    <Button 
                      variant="ghost" 
                      className="w-full h-full flex flex-col gap-2"
                      onClick={() => setEditingProduct({ name: '', description: '', price: 0, category: 'Styling', stock: 0, visible: true, image_url: '' })}
                    >
                      <Plus className="h-8 w-8 text-muted-foreground" />
                      <span className="text-muted-foreground">Novo Produto</span>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <h2 className="text-xl sm:text-2xl font-bold pl-12 lg:pl-0">Financeiro</h2>
                <FinancialDashboard />
              </div>
            )}

            {activeTab === 'historico-cp' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <HistoricoCP />
              </div>
            )}

            {activeTab === 'fila' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <h2 className="text-xl sm:text-2xl font-bold pl-12 lg:pl-0">Fila da Barbearia</h2>
                <FilaDaBarbearia />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <h2 className="text-xl sm:text-2xl font-bold pl-12 lg:pl-0">Configurações</h2>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base sm:text-lg">Estimativa de Cached Egress</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncEgressFromSupabase}
                    disabled={syncingEgress}
                    className="w-full sm:w-auto"
                  >
                    {syncingEgress ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      'Atualizar do Supabase'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Uso no período (GB)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={egressUsedGbInput}
                      onChange={(e) => setEgressUsedGbInput(e.target.value)}
                      placeholder="Ex.: 0.05"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Consulte em: Dashboard &gt; Organization &gt; Usage
                    </p>
                  </div>
                  <div>
                    <Label>Dias decorridos no período</Label>
                    <Input
                      type="number"
                      min={1}
                      max={BILLING_PERIOD_DAYS}
                      value={egressDaysElapsedInput}
                      onChange={(e) => setEgressDaysElapsedInput(e.target.value)}
                      placeholder="Ex.: 22"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="rounded-lg border border-border p-3 bg-secondary/20">
                    <p className="text-xs text-muted-foreground">Média diária</p>
                    <p className="text-lg font-bold">{egressEstimate.dailyMb.toFixed(1)} MB/dia</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-secondary/20">
                    <p className="text-xs text-muted-foreground">Projeção 30 dias</p>
                    <p className="text-lg font-bold">{egressEstimate.projectedMonthlyGb.toFixed(2)} GB</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-secondary/20">
                    <p className="text-xs text-muted-foreground">Meta diária</p>
                    <p className="text-lg font-bold">{EGRESS_TARGET_DAILY_MB} MB/dia</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-secondary/20">
                    <p className="text-xs text-muted-foreground">Limite seguro daqui pra frente</p>
                    <p className="text-lg font-bold">{egressEstimate.safeDailyFromNowMb.toFixed(1)} MB/dia</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={egressEstimate.isAboveTarget ? 'destructive' : 'secondary'}>
                    {egressEstimate.isAboveTarget
                      ? `Acima da meta em ${egressEstimate.reductionNeededPct.toFixed(1)}%`
                      : 'Dentro da meta diária'}
                  </Badge>
                  <Badge variant={egressEstimate.willExceedPlan ? 'destructive' : 'secondary'}>
                    {egressEstimate.willExceedPlan
                      ? 'Projeção excede 5 GB'
                      : 'Projeção dentro de 5 GB'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Restante no plano: {egressEstimate.remainingGb.toFixed(2)} GB em {egressEstimate.remainingDays} dia(s).
                </p>
                <p className="text-xs text-muted-foreground">
                  {egressLastSyncedAt
                    ? `Última sincronização automática: ${new Date(egressLastSyncedAt).toLocaleString('pt-BR')}`
                    : 'Sem sincronização automática registrada ainda.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-[200px_auto] gap-2 items-end">
                  <div>
                    <Label>Horário diário do sync automático</Label>
                    <Input
                      type="time"
                      value={egressScheduleTime}
                      onChange={(e) => setEgressScheduleTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      onClick={handleSaveEgressSchedule}
                      disabled={savingEgressSchedule}
                      className="w-full md:w-auto"
                    >
                      {savingEgressSchedule ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando horário...
                        </>
                      ) : (
                        'Salvar horário automático'
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[auto_260px_auto] gap-2 items-end">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Enviar report diário de egress no WhatsApp</p>
                      <p className="text-xs text-muted-foreground">Destino separado do relatório financeiro diário.</p>
                    </div>
                    <Switch
                      checked={egressWhatsappEnabled}
                      onCheckedChange={setEgressWhatsappEnabled}
                    />
                  </div>
                  <div>
                    <Label>Número WhatsApp do egress</Label>
                    <Input
                      type="text"
                      value={egressWhatsappPhone}
                      onChange={(e) => setEgressWhatsappPhone(e.target.value)}
                      placeholder="5511999999999"
                    />
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      onClick={handleSaveEgressWhatsappConfig}
                      disabled={savingEgressWhatsappConfig}
                      className="w-full md:w-auto"
                    >
                      {savingEgressWhatsappConfig ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando WhatsApp...
                        </>
                      ) : (
                        'Salvar WhatsApp egress'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTestEgressWhatsappReport}
                      disabled={testingEgressWhatsapp}
                      className="w-full md:w-auto mt-2"
                    >
                      {testingEgressWhatsapp ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando envio...
                        </>
                      ) : (
                        'Testar envio'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Minha conta - troca de senha do próprio admin/gestor */}
            <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-lg sm:text-xl">Minha Conta</CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Nova senha</Label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        placeholder="Digite a nova senha"
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Confirmar nova senha</Label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        placeholder="Repita a nova senha"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <Button
                      onClick={handleChangeOwnPassword}
                      disabled={changingPassword}
                      className="w-full sm:w-auto"
                    >
                      {changingPassword && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <span className="hidden sm:inline">Atualizar minha senha</span>
                      <span className="sm:hidden">Atualizar senha</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <OperatingHoursEditor />
            <SiteConfigEditor />
            
            {/* Card de Manutenção de Dados */}
            <Card className="bg-card border-destructive/50 shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-destructive text-lg sm:text-xl">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Manutenção de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use esta opção com cuidado. A exclusão de registros é <strong>permanente e irreversível</strong>.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={clearingAppointments} className="w-full sm:w-auto">
                        {clearingAppointments ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Limpar Todos os Agendamentos</span>
                        <span className="sm:hidden">Limpar Agendamentos</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
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
                </div>
              </CardContent>
            </Card>
              </div>
            )}

            {activeTab === 'images' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <h2 className="text-xl sm:text-2xl font-bold pl-12 lg:pl-0">Gerenciar Imagens</h2>
                <ImageManager />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <UserManager />
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <h2 className="text-xl sm:text-2xl font-bold pl-12 lg:pl-0">WhatsApp</h2>
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
