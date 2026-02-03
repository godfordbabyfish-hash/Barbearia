import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Loader2, Calendar, Clock, User, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  booking_type: string;
  status: string;
  notes?: string | null;
  client_id: string;
  barber_id: string;
  service_id: string;
  service?: { title: string; price: number } | null;
  barber?: { name: string } | null;
  client?: { name: string; phone?: string } | null;
}

const HistoricoCP = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filtros
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterBarber, setFilterBarber] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'local' | 'online'>('all');

  // Form de edição
  const [editForm, setEditForm] = useState({
    appointment_date: '',
    appointment_time: '',
    barber_id: '',
    service_id: '',
    status: '',
    notes: '',
  });

  useEffect(() => {
    loadBarbers();
    loadServices();
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [filterDateFrom, filterDateTo, filterBarber, filterService, filterStatus, filterType]);

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('visible', true)
      .order('name');

    if (error) {
      console.error('Error loading barbers:', error);
      toast.error('Erro ao carregar barbeiros');
    } else {
      setBarbers(data || []);
    }
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('id, title, price')
      .eq('visible', true)
      .order('order_index');

    if (error) {
      console.error('Error loading services:', error);
      toast.error('Erro ao carregar serviços');
    } else {
      setServices(data || []);
    }
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          booking_type,
          status,
          notes,
          client_id,
          barber_id,
          service_id,
          service:services(title, price),
          barber:barbers(name)
        `)
        // Filtrar apenas agendamentos locais e online (excluir manuais)
        .in('booking_type', ['local', 'online']);

      // Aplicar filtros
      if (filterDateFrom) {
        query = query.gte('appointment_date', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('appointment_date', filterDateTo);
      }
      if (filterBarber !== 'all') {
        query = query.eq('barber_id', filterBarber);
      }
      if (filterService !== 'all') {
        query = query.eq('service_id', filterService);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterType !== 'all') {
        query = query.eq('booking_type', filterType);
      }

      const { data, error } = await query
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) throw error;

      // Carregar dados dos clientes separadamente
      if (data && data.length > 0) {
        const clientIds = [...new Set(data.map(apt => apt.client_id))];
        const { data: clientsData } = await supabase
          .from('profiles')
          .select('id, name, phone')
          .in('id', clientIds);

        const clientsMap = new Map(clientsData?.map(c => [c.id, c]) || []);
        const appointmentsWithClients = data.map(apt => ({
          ...apt,
          client: clientsMap.get(apt.client_id) || null,
        }));

        setAppointments(appointmentsWithClients as Appointment[]);
      } else {
        setAppointments([]);
      }
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      toast.error('Erro ao carregar agendamentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setEditForm({
      appointment_date: appointment.appointment_date,
      appointment_time: appointment.appointment_time,
      barber_id: appointment.barber_id,
      service_id: appointment.service_id,
      status: appointment.status,
      notes: appointment.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingAppointment) return;

    if (!editForm.appointment_date || !editForm.appointment_time || !editForm.barber_id || !editForm.service_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: editForm.appointment_date,
          appointment_time: editForm.appointment_time,
          barber_id: editForm.barber_id,
          service_id: editForm.service_id,
          status: editForm.status,
          notes: editForm.notes || null,
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      toast.success('Agendamento atualizado com sucesso!');
      setEditDialogOpen(false);
      setEditingAppointment(null);
      loadAppointments();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAppointment) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', deletingAppointment.id);

      if (error) throw error;

      toast.success('Agendamento excluído com sucesso!');
      setDeleteDialogOpen(false);
      setDeletingAppointment(null);
      loadAppointments();
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao excluir agendamento: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      confirmed: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      pending: 'outline',
    };
    const labels: Record<string, string> = {
      confirmed: 'Confirmado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      pending: 'Pendente',
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      local: 'Local',
      online: 'Online',
      manual: 'Manual',
    };
    return (
      <Badge variant="outline">
        {labels[type] || type}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="hidden sm:inline">Histórico CP - Agendamentos Locais/Online</span>
            <span className="sm:hidden">Histórico CP</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Data Inicial</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Data Final</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Barbeiro</Label>
              <Select value={filterBarber} onValueChange={setFilterBarber}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Serviço</Label>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Tipo</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de agendamentos */}
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 sm:py-12 text-sm">
              Nenhum agendamento encontrado com os filtros selecionados.
            </p>
          ) : (
            <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Data</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[60px] sm:w-[80px]">Horário</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[150px]">Cliente</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[100px] sm:w-[120px]">Barbeiro</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[120px] sm:w-[150px]">Serviço</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[70px] sm:w-[80px]">Tipo</th>
                      <th className="text-left py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Status</th>
                      <th className="text-right py-2 sm:py-3 px-1 sm:px-2 w-[80px] sm:w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs sm:text-sm">
                            {format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-xs sm:text-sm">{apt.appointment_time}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div>
                            <div className="font-medium text-xs sm:text-sm truncate" title={apt.client?.name || 'N/A'}>
                              {apt.client?.name || 'N/A'}
                            </div>
                            {apt.client?.phone && (
                              <div className="text-xs text-muted-foreground truncate" title={apt.client.phone}>
                                {apt.client.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="text-xs sm:text-sm truncate" title={apt.barber?.name || 'N/A'}>
                            {apt.barber?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div>
                            <div className="text-xs sm:text-sm truncate" title={apt.service?.title || 'N/A'}>
                              {apt.service?.title || 'N/A'}
                            </div>
                            {apt.service?.price && (
                              <div className="text-xs text-muted-foreground">
                                R$ {apt.service.price.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">{getTypeBadge(apt.booking_type)}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">{getStatusBadge(apt.status)}</td>
                        <td className="py-2 sm:py-3 px-1 sm:px-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(apt)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setDeletingAppointment(apt);
                                setDeleteDialogOpen(true);
                              }}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Altere as informações do agendamento abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label className="text-sm">Data</Label>
              <Input
                type="date"
                value={editForm.appointment_date}
                onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm">Horário</Label>
              <Input
                type="time"
                value={editForm.appointment_time}
                onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <Label className="text-sm">Barbeiro</Label>
              <Select
                value={editForm.barber_id}
                onValueChange={(value) => setEditForm({ ...editForm, barber_id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Serviço</Label>
              <Select
                value={editForm.service_id}
                onValueChange={(value) => setEditForm({ ...editForm, service_id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title} - R$ {service.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Observações (opcional)</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Observações sobre o agendamento"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 sm:mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditingAppointment(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
              {deletingAppointment && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                  <div><strong>Cliente:</strong> {deletingAppointment.client?.name || 'N/A'}</div>
                  <div><strong>Data:</strong> {format(new Date(deletingAppointment.appointment_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</div>
                  <div><strong>Horário:</strong> {deletingAppointment.appointment_time}</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoricoCP;
