import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Clock, Calendar as CalendarIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBarberBreaks, BarberBreak, ConflictInfo } from '@/hooks/useBarberBreaks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOperatingHours, dayNames, dayOrder, getDayKey, OperatingHours, DayHours } from '@/hooks/useOperatingHours';
import { useBarberAvailability, BarberAvailability, defaultBarberAvailability } from '@/hooks/useBarberAvailability';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';

interface BarberBreakManagerProps {
  barberId: string;
}

export const BarberBreakManager = ({ barberId }: BarberBreakManagerProps) => {
  const { breaks, loading, createBreak, updateBreak, deleteBreak, checkConflict } = useBarberBreaks(barberId);
  const { operatingHours, loading: hoursLoading } = useOperatingHours();
  const { availability, loading: availabilityLoading, updateDayAvailability } = useBarberAvailability(barberId);
  const { role } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBreak, setEditingBreak] = useState<BarberBreak | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [editingAvailability, setEditingAvailability] = useState<{
    dayKey: keyof BarberAvailability;
    dayHours: DayHours;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const isManager = role === 'admin' || role === 'gestor';

  useEffect(() => {
    if (selectedIds.length > 0 && breaks.length > 0) {
      const valid = new Set(breaks.map(b => b.id));
      setSelectedIds(prev => prev.filter(id => valid.has(id)));
    }
  }, [breaks]);

  const toggleSelect = (id: string, checked: boolean | string) => {
    setSelectedIds(prev => {
      const isChecked = checked === true || checked === 'indeterminate';
      return isChecked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter(x => x !== id);
    });
  };

  const selectAll = () => setSelectedIds(breaks.map(b => b.id));
  const clearSelection = () => setSelectedIds([]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm('Tem certeza que deseja excluir as pausas selecionadas?')) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map(async (id) => {
          const { error } = await deleteBreak(id);
          return { id, error };
        })
      );
      const anyError = results.some(r => r.status === 'fulfilled' && (r as any).value.error);
      if (anyError) {
        toast.warning('Algumas pausas podem não ter sido excluídas');
      } else {
        toast.success('Pausas excluídas com sucesso');
      }
      setSelectedIds([]);
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    if (dialogOpen && !editingBreak) {
      // Reset form when opening for new break
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        date: format(tomorrow, 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
      });
      setConflictInfo(null);
    } else if (editingBreak) {
      setFormData({
        date: editingBreak.date,
        startTime: editingBreak.start_time,
        endTime: editingBreak.end_time,
      });
      setConflictInfo(null);
    }
  }, [dialogOpen, editingBreak]);

  // Check for conflicts when form data changes
  useEffect(() => {
    if (formData.date && formData.startTime && formData.endTime && formData.endTime > formData.startTime) {
      const timeoutId = setTimeout(async () => {
        setCheckingConflict(true);
        const conflict = await checkConflict(
          barberId,
          formData.date,
          formData.startTime,
          formData.endTime,
          editingBreak?.id
        );
        setConflictInfo(conflict);
        setCheckingConflict(false);
      }, 500); // Debounce

      return () => clearTimeout(timeoutId);
    } else {
      setConflictInfo(null);
    }
  }, [formData.date, formData.startTime, formData.endTime, barberId, editingBreak?.id, checkConflict]);

  const handleSave = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (formData.endTime <= formData.startTime) {
      toast.error('Horário de fim deve ser maior que horário de início');
      return;
    }

    // Check if date is in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error('Não é possível criar pausa em datas passadas');
      return;
    }

    // Check for conflicts one more time before saving
    if (conflictInfo?.hasConflict) {
      toast.error('Não é possível salvar pausa com conflito de agendamento');
      return;
    }

    if (editingBreak) {
      const { error } = await updateBreak(
        editingBreak.id,
        formData.date,
        formData.startTime,
        formData.endTime
      );

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Pausa atualizada com sucesso!');
        setDialogOpen(false);
        setEditingBreak(null);
      }
    } else {
      const { error } = await createBreak(
        barberId,
        formData.date,
        formData.startTime,
        formData.endTime
      );

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Pausa criada com sucesso!');
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async (breakId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pausa?')) {
      return;
    }

    const { error } = await deleteBreak(breakId);
    if (error) {
      toast.error('Erro ao excluir pausa');
    } else {
      toast.success('Pausa excluída!');
    }
  };

  const handleEdit = (breakItem: BarberBreak) => {
    setEditingBreak(breakItem);
    setDialogOpen(true);
  };

  // Group breaks by date
  const breaksByDate = breaks.reduce((acc, breakItem) => {
    if (!acc[breakItem.date]) {
      acc[breakItem.date] = [];
    }
    acc[breakItem.date].push(breakItem);
    return acc;
  }, {} as Record<string, BarberBreak[]>);

  // Helper to check if a break is within barber's availability for that day
  const isBreakWithinHours = (breakItem: BarberBreak): boolean => {
    const date = new Date(breakItem.date + 'T00:00:00');
    const dayKey = getDayKey(date);
    const barberDayHours = availability[dayKey];
    
    if (barberDayHours.closed) return false;
    
    return breakItem.start_time >= barberDayHours.open && breakItem.end_time <= barberDayHours.close;
  };

  // Get breaks for a specific day of the week
  const getBreaksForDay = (dayKey: keyof OperatingHours): BarberBreak[] => {
    return breaks.filter(breakItem => {
      const date = new Date(breakItem.date + 'T00:00:00');
      return getDayKey(date) === dayKey;
    });
  };

  const handleAvailabilityChange = async (dayKey: keyof BarberAvailability, field: keyof DayHours, value: any) => {
    const currentDay = availability[dayKey];
    const newDayHours = { ...currentDay, [field]: value };
    const { error } = await updateDayAvailability(dayKey, newDayHours);
    if (error) {
      toast.error('Erro ao atualizar disponibilidade');
    } else {
      toast.success('Disponibilidade atualizada!');
    }
  };

  if (loading || hoursLoading || availabilityLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando horários...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Gerenciar Pausas */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Gerenciar Horários de Pausa
            </CardTitle>
            <div className="flex items-center gap-2">
              {isManager && (
                <>
                  <Button variant="outline" size="sm" onClick={selectAll} disabled={breaks.length === 0}>
                    Selecionar tudo
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection} disabled={selectedIds.length === 0}>
                    Limpar seleção
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0 || bulkDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir selecionadas
                  </Button>
                </>
              )}
              <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingBreak(null);
                setConflictInfo(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Pausa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingBreak ? 'Editar Pausa' : 'Nova Pausa'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                    {formData.date && (() => {
                      const selectedDate = new Date(formData.date + 'T00:00:00');
                      const dayKey = getDayKey(selectedDate);
                      const dayHours = operatingHours[dayKey];
                      return (
                        <p className="text-xs text-muted-foreground mt-1">
                          {dayHours.closed ? (
                            <span className="text-red-400">⚠️ A barbearia está fechada neste dia</span>
                          ) : (
                            <span>Horário de funcionamento: {dayHours.open} - {dayHours.close}</span>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <Label htmlFor="startTime">Horário de Início da Pausa</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Horário de Fim da Pausa</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                    {formData.date && formData.startTime && formData.endTime && (() => {
                      const selectedDate = new Date(formData.date + 'T00:00:00');
                      const dayKey = getDayKey(selectedDate);
                      const dayHours = operatingHours[dayKey];
                      const withinHours = !dayHours.closed && 
                        formData.startTime >= dayHours.open && 
                        formData.endTime <= dayHours.close;
                      
                      if (!withinHours && !dayHours.closed) {
                        return (
                          <p className="text-xs text-yellow-400 mt-1">
                            ⚠️ A pausa está fora do horário de funcionamento ({dayHours.open} - {dayHours.close})
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {checkingConflict && (
                    <p className="text-sm text-muted-foreground">Verificando conflitos...</p>
                  )}

                  {conflictInfo?.hasConflict && conflictInfo.appointment && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Não é possível criar pausa neste horário.</strong>
                        <br />
                        Existe agendamento com:
                        <br />
                        <strong>Cliente:</strong> {conflictInfo.appointment.clientName}
                        <br />
                        <strong>Serviço:</strong> {conflictInfo.appointment.serviceTitle}
                        <br />
                        <strong>Horário:</strong> {conflictInfo.appointment.appointmentTime} às {conflictInfo.appointment.appointmentEndTime}
                      </AlertDescription>
                    </Alert>
                  )}

                  {formData.startTime && formData.endTime && formData.endTime <= formData.startTime && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Horário de fim deve ser maior que horário de início
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={!!conflictInfo?.hasConflict || checkingConflict || (formData.endTime && formData.endTime <= formData.startTime)}
                      className="flex-1"
                    >
                      {editingBreak ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setEditingBreak(null);
                        setConflictInfo(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {breaks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma pausa cadastrada. Clique em "Adicionar Pausa" para criar uma.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(breaksByDate).map(([date, dateBreaks]) => (
                <div key={date} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(new Date(date + 'T00:00:00'), 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                  </div>
                  <div className="space-y-2">
                    {dateBreaks.map((breakItem) => (
                      <div
                        key={breakItem.id}
                        className="flex items-center justify-between p-2 bg-secondary rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-2">
                          {isManager && (
                            <Checkbox
                              checked={selectedIds.includes(breakItem.id)}
                              onCheckedChange={(checked) => toggleSelect(breakItem.id, checked as any)}
                              className="mr-1"
                            />
                          )}
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {breakItem.start_time} - {breakItem.end_time}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(breakItem)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(breakItem.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Minha Disponibilidade Semanal */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Minha Disponibilidade Semanal
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Configure seus horários de disponibilidade por dia da semana.
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-3">
            {dayOrder.map((dayKey) => {
              const barberDayHours = availability[dayKey];
              const shopDayHours = operatingHours[dayKey];
              
              return (
                <div key={dayKey} className="p-3 bg-secondary/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{dayNames[dayKey]}</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor={`closed-${dayKey}`} className="text-xs cursor-pointer">
                          {barberDayHours.closed ? 'Fechado' : 'Disponível'}
                        </Label>
                        <Switch
                          id={`closed-${dayKey}`}
                          checked={!barberDayHours.closed}
                          onCheckedChange={(checked) => 
                            handleAvailabilityChange(dayKey, 'closed', !checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  
                  {!barberDayHours.closed && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <Label htmlFor={`open-${dayKey}`} className="text-xs">Horário de Abertura</Label>
                        <Input
                          id={`open-${dayKey}`}
                          type="time"
                          value={barberDayHours.open}
                          onChange={(e) => handleAvailabilityChange(dayKey, 'open', e.target.value)}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`close-${dayKey}`} className="text-xs">Horário de Fechamento</Label>
                        <Input
                          id={`close-${dayKey}`}
                          type="time"
                          value={barberDayHours.close}
                          onChange={(e) => handleAvailabilityChange(dayKey, 'close', e.target.value)}
                          className="mt-1 h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] text-muted-foreground">
                          Programação da barbearia: {shopDayHours.open} - {shopDayHours.close}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Programação da Barbearia (Referência) */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Programação da Barbearia (Referência)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-3">
            {dayOrder.map((dayKey) => {
              const dayHours = operatingHours[dayKey];
              const barberDayHours = availability[dayKey];
              const dayBreaks = getBreaksForDay(dayKey);
              
              return (
                <div key={dayKey} className="p-3 bg-secondary/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{dayNames[dayKey]}</h3>
                    <div className="flex gap-2 items-center">
                      {dayHours.closed ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
                          Barbearia Fechada
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                          {dayHours.open} - {dayHours.close}
                        </span>
                      )}
                      {barberDayHours.closed ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-400">
                          Você Indisponível
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          Você: {barberDayHours.open} - {barberDayHours.close}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!dayHours.closed && !barberDayHours.closed && dayBreaks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Suas pausas neste dia:</p>
                      {dayBreaks.map((breakItem) => (
                        <div
                          key={breakItem.id}
                          className="flex items-center justify-between p-2 bg-secondary rounded border border-border"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">
                              {breakItem.start_time} - {breakItem.end_time}
                            </span>
                            {!isBreakWithinHours(breakItem) && (
                              <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                Fora do seu horário de disponibilidade
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(breakItem)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(breakItem.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      
    </div>
  );
};
