import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Plus, X, Loader2, Users, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOperatingHours, getDayKey } from '@/hooks/useOperatingHours';

interface Barber {
  id: string;
  name: string;
}

interface DayScheduleState {
  open: string;
  close: string;
  closed: boolean;
  observation: string;
  lunch_start: string;
  lunch_end: string;
  has_lunch: boolean;
  pause_start: string;
  pause_end: string;
  has_pause: boolean;
}

const defaultDaySchedule: DayScheduleState = {
  open: '09:00',
  close: '20:00',
  closed: false,
  observation: '',
  lunch_start: '12:00',
  lunch_end: '13:00',
  has_lunch: false,
  pause_start: '15:00',
  pause_end: '15:30',
  has_pause: false,
};

const AdminMonthlySchedule = () => {
  const { operatingHours } = useOperatingHours();

  const [mode, setMode] = useState<'barber' | 'shop'>('barber');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [barberSchedules, setBarberSchedules] = useState<Record<string, any>>({});
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [editingDay, setEditingDay] = useState<Date | null>(null);
  const [daySchedule, setDaySchedule] = useState<DayScheduleState>(defaultDaySchedule);
  const [saving, setSaving] = useState(false);

  const [bulkLunchOpen, setBulkLunchOpen] = useState(false);
  const [bulkLunch, setBulkLunch] = useState({ start: '12:00', end: '13:00' });
  const [applyingBulkLunch, setApplyingBulkLunch] = useState(false);

  useEffect(() => {
    loadBarbers();
  }, []);

  useEffect(() => {
    if (mode === 'barber' && selectedBarberId) {
      loadBarberSchedules();
    } else if (mode === 'shop') {
      loadShopMonthlySchedules();
    }
  }, [mode, selectedBarberId, currentMonth]);

  const loadBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('visible', true)
      .order('name');
    if (data) {
      setBarbers(data);
      if (data.length > 0) setSelectedBarberId(data[0].id);
    }
  };

  const loadBarberSchedules = async () => {
    if (!selectedBarberId) return;
    setLoadingSchedules(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const { data } = await (supabase as any)
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', selectedBarberId)
        .gte('date', start)
        .lte('date', end);
      const map: Record<string, any> = {};
      (data || []).forEach((item: any) => { map[item.date] = item; });
      setBarberSchedules(map);
    } catch (e) {
      console.error('Erro ao carregar escala:', e);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const loadShopMonthlySchedules = async () => {
    setLoadingSchedules(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const { data } = await (supabase as any)
        .from('shop_schedules')
        .select('*')
        .gte('date', start)
        .lte('date', end);
      const map: Record<string, any> = {};
      (data || []).forEach((item: any) => { map[item.date] = item; });
      setBarberSchedules(map);
    } catch {
      setBarberSchedules({});
    } finally {
      setLoadingSchedules(false);
    }
  };

  const openDayEditor = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const existing = barberSchedules[dateStr];
    const dayKey = getDayKey(date);
    const shopHours = operatingHours[dayKey];
    const openTime = existing?.open || shopHours?.open || '09:00';
    const closeTime = existing?.close || shopHours?.close || '20:00';
    setDaySchedule({
      open: openTime,
      close: closeTime,
      closed: existing ? existing.closed : (shopHours?.closed ?? false),
      observation: existing?.observation || '',
      lunch_start: existing?.lunch_start || '12:00',
      lunch_end: existing?.lunch_end || '13:00',
      has_lunch: existing ? existing.has_lunch : false,
      pause_start: existing?.pause_start || '15:00',
      pause_end: existing?.pause_end || '15:30',
      has_pause: existing?.has_pause || false,
    });
    setEditingDay(date);
  };

  const saveDaySchedule = async () => {
    if (!editingDay) return;
    setSaving(true);
    try {
      const dateStr = editingDay.toISOString().split('T')[0];
      if (mode === 'barber') {
        if (!selectedBarberId) return;
        const { error } = await (supabase as any)
          .from('barber_schedules')
          .upsert({
            barber_id: selectedBarberId,
            date: dateStr,
            ...daySchedule,
          }, { onConflict: 'barber_id,date' });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('shop_schedules')
          .upsert({ date: dateStr, ...daySchedule }, { onConflict: 'date' });
        if (error) throw error;
      }
      toast.success('Programação do dia salva!');
      setEditingDay(null);
      mode === 'barber' ? loadBarberSchedules() : loadShopMonthlySchedules();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const applyLunchToMonth = async () => {
    const targetId = mode === 'barber' ? selectedBarberId : null;
    if (mode === 'barber' && !targetId) return;
    setApplyingBulkLunch(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toISOString().split('T')[0];
        const existing = barberSchedules[dateStr];
        const dayKey = getDayKey(date);
        const shopHours = operatingHours[dayKey];
        const isOpen = existing ? !existing.closed : (shopHours ? !shopHours.closed : true);
        if (!isOpen) continue;
        if (mode === 'barber') {
          await (supabase as any).from('barber_schedules').upsert({
            barber_id: targetId,
            date: dateStr,
            open: existing?.open || shopHours?.open || '09:00',
            close: existing?.close || shopHours?.close || '20:00',
            closed: existing?.closed ?? false,
            observation: existing?.observation || '',
            lunch_start: bulkLunch.start,
            lunch_end: bulkLunch.end,
            has_lunch: true,
            pause_start: existing?.pause_start || '15:00',
            pause_end: existing?.pause_end || '15:30',
            has_pause: existing?.has_pause ?? false,
          }, { onConflict: 'barber_id,date' });
        } else {
          await (supabase as any).from('shop_schedules').upsert({
            date: dateStr,
            open: existing?.open || shopHours?.open || '09:00',
            close: existing?.close || shopHours?.close || '20:00',
            closed: existing?.closed ?? false,
            observation: existing?.observation || '',
            lunch_start: bulkLunch.start,
            lunch_end: bulkLunch.end,
            has_lunch: true,
            pause_start: existing?.pause_start || '15:00',
            pause_end: existing?.pause_end || '15:30',
            has_pause: existing?.has_pause ?? false,
          }, { onConflict: 'date' });
        }
      }
      toast.success('Horário de almoço aplicado ao mês!');
      setBulkLunchOpen(false);
      mode === 'barber' ? loadBarberSchedules() : loadShopMonthlySchedules();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setApplyingBulkLunch(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 px-3 sm:px-6 sm:pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            Escala Mensal — {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Mode toggle */}
            <Button
              variant={mode === 'barber' ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1"
              onClick={() => setMode('barber')}
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Barbeiro</span>
            </Button>
            <Button
              variant={mode === 'shop' ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1"
              onClick={() => setMode('shop')}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Barbearia</span>
            </Button>

            {/* Barber selector */}
            {mode === 'barber' && (
              <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                <SelectTrigger className="h-8 w-36 sm:w-44 text-xs">
                  <SelectValue placeholder="Barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Lunch bulk button */}
            <Button
              variant="outline"
              size="sm"
              className="text-orange-500 border-orange-500/40 hover:bg-orange-500/10 gap-1.5 h-8 px-2 sm:px-3"
              onClick={() => setBulkLunchOpen(true)}
            >
              <span className="text-xs">🍴</span>
              <span className="hidden sm:inline text-xs">Almoço do Mês</span>
            </Button>

            {/* Month navigation */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            >
              <X className="h-3.5 w-3.5 rotate-45" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            >
              <Plus className="h-3.5 w-3.5 rotate-45" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-6 pb-4">
        {loadingSchedules ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
            {/* Day headers */}
            {[['D','Dom'],['S','Seg'],['T','Ter'],['Q','Qua'],['Q','Qui'],['S','Sex'],['S','Sáb']].map(([short, full], i) => (
              <div key={i} className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground py-1.5 sm:py-2 uppercase">
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{full}</span>
              </div>
            ))}

            {/* Empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`e-${i}`} className="h-20 sm:h-24 bg-secondary/10 rounded-lg opacity-30" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const d = idx + 1;
              const date = new Date(year, month, d);
              const dateStr = date.toISOString().split('T')[0];
              const schedule = barberSchedules[dateStr];
              const isToday = dateStr === today;
              const dayKey = getDayKey(date);
              const shopHours = operatingHours[dayKey];
              const isOpen = schedule ? !schedule.closed : (shopHours ? !shopHours.closed : true);
              const openTime = schedule?.open || shopHours?.open || '09:00';
              const closeTime = schedule?.close || shopHours?.close || '20:00';

              return (
                <button
                  key={d}
                  onClick={() => openDayEditor(date)}
                  className={`h-20 sm:h-24 p-1 sm:p-2 rounded-lg border text-left transition-all hover:border-primary/50 relative overflow-hidden ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border bg-secondary/20'
                  } ${!isOpen ? 'opacity-60 bg-red-500/5' : ''}`}
                >
                  <span className={`text-[10px] sm:text-xs font-bold block leading-tight ${
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  }`}>{d}</span>

                  <div className="mt-0.5 space-y-0.5">
                    {!isOpen ? (
                      <span className="text-[9px] sm:text-[10px] text-red-500 font-medium block">Fechado</span>
                    ) : (
                      <>
                        <span className="text-[9px] sm:text-[10px] text-foreground font-medium block leading-tight">
                          {openTime} - {closeTime}
                        </span>
                        {schedule?.has_lunch && (
                          <span className="text-[8px] sm:text-[9px] text-orange-500 font-medium block leading-tight">
                            🍴 {schedule.lunch_start} - {schedule.lunch_end}
                          </span>
                        )}
                        {schedule?.has_pause && (
                          <span className="text-[8px] sm:text-[9px] text-blue-500 font-medium block leading-tight">
                            ☕ {schedule.pause_start} - {schedule.pause_end}
                          </span>
                        )}
                        {schedule?.observation && (
                          <div className="flex items-center gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse shrink-0" />
                            <span className="text-[8px] sm:text-[9px] text-primary truncate italic">
                              {schedule.observation}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {schedule && (
                    <div className="absolute top-0.5 right-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Day edit dialog */}
      <Dialog open={editingDay !== null} onOpenChange={(open) => !open && setEditingDay(null)}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
            <DialogTitle className="text-base">
              Programação: {editingDay && format(editingDay, "dd 'de' MMMM", { locale: ptBR })}
              {mode === 'barber' && selectedBarberId && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  — {barbers.find(b => b.id === selectedBarberId)?.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {mode === 'barber' ? 'Horário individual do barbeiro neste dia.' : 'Horário da barbearia neste dia.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 px-4 py-2 overflow-y-auto flex-1">
            {/* Status */}
            <div className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-secondary/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Status do Dia</Label>
                <p className="text-xs text-muted-foreground">
                  {daySchedule.closed ? 'Fechado' : 'Aberto para agendamentos'}
                </p>
              </div>
              <Switch
                checked={!daySchedule.closed}
                onCheckedChange={(checked) => setDaySchedule({ ...daySchedule, closed: !checked })}
              />
            </div>

            {!daySchedule.closed && (
              <>
                {/* Open / Close */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Abertura</Label>
                    <Input type="time" className="h-9 text-sm" value={daySchedule.open}
                      onChange={(e) => setDaySchedule({ ...daySchedule, open: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fechamento</Label>
                    <Input type="time" className="h-9 text-sm" value={daySchedule.close}
                      onChange={(e) => setDaySchedule({ ...daySchedule, close: e.target.value })} />
                  </div>
                </div>

                {/* Lunch */}
                <div className="border border-border rounded-lg bg-secondary/30 overflow-hidden">
                  <div className="flex items-center justify-between p-2.5">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">🍴 Horário de Almoço</Label>
                      <p className="text-xs text-muted-foreground">Habilitar intervalo de almoço</p>
                    </div>
                    <Switch checked={daySchedule.has_lunch}
                      onCheckedChange={(checked) => setDaySchedule({ ...daySchedule, has_lunch: checked })} />
                  </div>
                  {daySchedule.has_lunch && (
                    <div className="grid grid-cols-2 gap-3 px-2.5 pb-2.5 pt-0">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Início</Label>
                        <Input type="time" className="h-9 text-sm" value={daySchedule.lunch_start}
                          onChange={(e) => setDaySchedule({ ...daySchedule, lunch_start: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fim</Label>
                        <Input type="time" className="h-9 text-sm" value={daySchedule.lunch_end}
                          onChange={(e) => setDaySchedule({ ...daySchedule, lunch_end: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pause */}
                <div className="border border-border rounded-lg bg-secondary/30 overflow-hidden">
                  <div className="flex items-center justify-between p-2.5">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">☕ Horário de Pausa</Label>
                      <p className="text-xs text-muted-foreground">Habilitar intervalo de pausa</p>
                    </div>
                    <Switch checked={daySchedule.has_pause}
                      onCheckedChange={(checked) => setDaySchedule({ ...daySchedule, has_pause: checked })} />
                  </div>
                  {daySchedule.has_pause && (
                    <div className="grid grid-cols-2 gap-3 px-2.5 pb-2.5 pt-0">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Início</Label>
                        <Input type="time" className="h-9 text-sm" value={daySchedule.pause_start}
                          onChange={(e) => setDaySchedule({ ...daySchedule, pause_start: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fim</Label>
                        <Input type="time" className="h-9 text-sm" value={daySchedule.pause_end}
                          onChange={(e) => setDaySchedule({ ...daySchedule, pause_end: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Observation */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Observação Interna</Label>
                  <Input type="text" className="h-9 text-sm"
                    placeholder="Ex: Feriado local, evento..."
                    value={daySchedule.observation}
                    onChange={(e) => setDaySchedule({ ...daySchedule, observation: e.target.value })} />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 px-4 py-3 border-t border-border shrink-0">
            <Button className="flex-1 h-9" onClick={saveDaySchedule} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar'}
            </Button>
            <Button variant="outline" className="h-9" onClick={() => setEditingDay(null)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk lunch dialog */}
      <Dialog open={bulkLunchOpen} onOpenChange={(open) => !open && setBulkLunchOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>🍴</span> Inserir Horário de Almoço
            </DialogTitle>
            <DialogDescription>
              Aplica o almoço a todos os dias abertos de{' '}
              <strong>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</strong>
              {mode === 'barber' && selectedBarberId && (
                <> — <strong>{barbers.find(b => b.id === selectedBarberId)?.name}</strong></>
              )}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="time" value={bulkLunch.start}
                  onChange={(e) => setBulkLunch({ ...bulkLunch, start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="time" value={bulkLunch.end}
                  onChange={(e) => setBulkLunch({ ...bulkLunch, end: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Dias fechados serão ignorados.
            </p>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={applyLunchToMonth} disabled={applyingBulkLunch}>
              {applyingBulkLunch
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Aplicando...</>
                : 'Aplicar ao Mês'
              }
            </Button>
            <Button variant="outline" onClick={() => setBulkLunchOpen(false)} disabled={applyingBulkLunch}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminMonthlySchedule;
