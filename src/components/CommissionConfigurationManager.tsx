import { useEffect, useMemo, useState } from 'react';
import { Layers3, Loader2, Scissors, ShoppingBag, SlidersHorizontal, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { IndividualCommissionManager } from '@/components/IndividualCommissionManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Barber = { id: string; name: string };
type CommissionKind = 'service' | 'product';

export function CommissionConfigurationManager() {
  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-2 sm:max-w-lg">
        <TabsTrigger value="general" className="gap-1.5">
          <Layers3 className="h-4 w-4" />
          Configuração geral
        </TabsTrigger>
        <TabsTrigger value="individual" className="gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          Individual
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="mt-4">
        <BulkCommissionManager />
      </TabsContent>
      <TabsContent value="individual" className="mt-4">
        <IndividualCommissionManager />
      </TabsContent>
    </Tabs>
  );
}

function BulkCommissionManager() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serviceCount, setServiceCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [scope, setScope] = useState('all');
  const [servicePercentage, setServicePercentage] = useState('');
  const [productPercentage, setProductPercentage] = useState('');
  const [saving, setSaving] = useState<CommissionKind | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [barbersResult, servicesResult, productsResult] = await Promise.all([
        supabase.from('barbers').select('id,name').eq('visible', true).order('order_index'),
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('visible', true),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('visible', true),
      ]);
      if (barbersResult.error || servicesResult.error || productsResult.error) {
        toast.error('Não foi possível carregar as opções de comissão.');
      }
      setBarbers(barbersResult.data ?? []);
      setServiceCount(servicesResult.count ?? 0);
      setProductCount(productsResult.count ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === scope),
    [barbers, scope],
  );

  const apply = async (kind: CommissionKind) => {
    const rawValue = kind === 'service' ? servicePercentage : productPercentage;
    const percentage = Number(rawValue.replace(',', '.'));
    if (!rawValue.trim() || !Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      toast.error('Informe um percentual entre 0 e 100.');
      return;
    }
    setSaving(kind);
    const { data, error } = await (supabase as any).rpc('apply_bulk_commission', {
      p_kind: kind,
      p_percentage: percentage,
      p_barber_id: scope === 'all' ? null : scope,
    });
    if (error) {
      toast.error('Erro ao preencher as comissões.', { description: error.message });
    } else {
      const result = data as { affected_rows?: number } | null;
      toast.success(
        kind === 'service' ? 'Comissões de serviços atualizadas.' : 'Comissões de produtos atualizadas.',
        { description: `${result?.affected_rows ?? 0} configuração(ões) preenchida(s).` },
      );
    }
    setSaving(null);
  };

  if (loading) {
    return <Card><CardContent className="flex min-h-40 items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando...</CardContent></Card>;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Layers3 className="h-5 w-5 text-primary" /> Preenchimento geral
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Preencha todos os serviços ou produtos de uma vez. Depois, use o modo Individual somente para criar exceções.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit">Operação auditada</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
          <Label htmlFor="commission-scope">Quem receberá esta configuração?</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger id="commission-scope" className="mt-2 w-full sm:max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os barbeiros ativos</SelectItem>
              {barbers.map((barber) => <SelectItem key={barber.id} value={barber.id}>{barber.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {scope === 'all' ? `${barbers.length} barbeiro(s) serão atualizados.` : `Somente ${selectedBarber?.name ?? 'o barbeiro selecionado'} será atualizado.`}
          </p>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:max-w-md">
            <TabsTrigger value="services" className="gap-1.5"><Scissors className="h-4 w-4" /> Serviços</TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5"><ShoppingBag className="h-4 w-4" /> Produtos</TabsTrigger>
          </TabsList>
          <TabsContent value="services" className="mt-4">
            <BulkPanel
              kind="service"
              label="Comissão geral dos serviços"
              description={`${serviceCount} serviço(s) ativo(s) serão preenchidos com o mesmo percentual.`}
              value={servicePercentage}
              onChange={setServicePercentage}
              saving={saving === 'service'}
              scopeLabel={scope === 'all' ? `todos os ${barbers.length} barbeiros` : selectedBarber?.name ?? 'o barbeiro'}
              onConfirm={() => apply('service')}
            />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <BulkPanel
              kind="product"
              label="Comissão geral dos produtos"
              description={`${productCount} produto(s) ativo(s) serão preenchidos com o mesmo percentual.`}
              value={productPercentage}
              onChange={setProductPercentage}
              saving={saving === 'product'}
              scopeLabel={scope === 'all' ? `todos os ${barbers.length} barbeiros` : selectedBarber?.name ?? 'o barbeiro'}
              onConfirm={() => apply('product')}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function BulkPanel({ kind, label, description, value, onChange, saving, scopeLabel, onConfirm }: {
  kind: CommissionKind;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  saving: boolean;
  scopeLabel: string;
  onConfirm: () => void;
}) {
  const itemLabel = kind === 'service' ? 'serviços' : 'produtos';
  return (
    <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
        <div>
          <h3 className="font-semibold">{label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div>
          <Label htmlFor={`bulk-${kind}`}>Percentual (%)</Label>
          <Input
            id={`bulk-${kind}`}
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.01"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Ex.: 50"
            className="mt-2"
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={saving || !value.trim()} className="w-full md:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers3 className="mr-2 h-4 w-4" />}
              Preencher todos
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar preenchimento geral?</AlertDialogTitle>
              <AlertDialogDescription>
                O percentual de {value || '0'}% substituirá a configuração atual de todos os {itemLabel} para {scopeLabel}. A operação ficará registrada na auditoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>Confirmar preenchimento</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
