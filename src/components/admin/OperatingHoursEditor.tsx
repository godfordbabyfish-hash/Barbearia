import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Coffee, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  useOperatingHours, 
  defaultOperatingHours, 
  dayNames, 
  OperatingHours,
  DayHours 
} from '@/hooks/useOperatingHours';
import { useBarberAvailability, BarberAvailability, defaultBarberAvailability } from '@/hooks/useBarberAvailability';

const dayDisplayOrder: (keyof OperatingHours)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

interface Barber {
  id: string;
  name: string;
  user_id: string;
}

const OperatingHoursEditor = () => {
  const { operatingHours, saveOperatingHours, loading } = useOperatingHours();
  const [hours, setHours] = useState<OperatingHours>(defaultOperatingHours);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'shop' | 'barber'>('shop');
  const { availability, updateAvailability, loading: availabilityLoading } = useBarberAvailability(selectedBarberId || null);
  const [barberHours, setBarberHours] = useState<BarberAvailability>(defaultBarberAvailability);

  useEffect(() => {
    if (!loading) {
      setHours(operatingHours);
    }
  }, [operatingHours, loading]);

  useEffect(() => {
    loadBarbers();
  }, []);

  useEffect(() => {
    if (!availabilityLoading) {
      setBarberHours(availability);
    }
  }, [availability, availabilityLoading]);

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name, user_id')
      .eq('visible', true)
      .order('name');

    if (!error && data) {
      setBarbers(data);
      if (data.length > 0 && !selectedBarberId) {
        setSelectedBarberId(data[0].id);
      }
    }
  };

  const updateDayHours = (day: keyof OperatingHours, field: keyof DayHours, value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const updateBarberDayHours = (day: keyof BarberAvailability, field: keyof DayHours, value: string | boolean) => {
    setBarberHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (viewMode === 'shop') {
      const { error } = await saveOperatingHours(hours);
      if (error) {
        toast.error('Erro ao salvar horários da barbearia');
      } else {
        toast.success('Horários da barbearia salvos!');
      }
    } else {
      if (!selectedBarberId) {
        toast.error('Selecione um barbeiro');
        return;
      }
      const { error } = await updateAvailability(barberHours);
      if (error) {
        toast.error('Erro ao salvar horários do barbeiro');
      } else {
        toast.success('Horários do barbeiro salvos!');
      }
    }
  };

  if (loading || availabilityLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const currentHours = viewMode === 'shop' ? hours : barberHours;
  const updateCurrentDayHours = viewMode === 'shop' ? updateDayHours : updateBarberDayHours;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Horários de Funcionamento
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'shop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('shop')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Barbearia
            </Button>
            <Button
              variant={viewMode === 'barber' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('barber')}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Barbeiro Individual
            </Button>
          </div>
          
          {viewMode === 'barber' && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Barbeiro:</Label>
              <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                <SelectTrigger className="w-48">
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
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          {viewMode === 'shop' 
            ? 'Configure os horários gerais da barbearia. Esses horários serão usados como base para todos os barbeiros.'
            : 'Configure os horários individuais do barbeiro selecionado. Estes horários sobrescrevem os horários gerais da barbearia.'
          }
        </p>
        
        <div className="space-y-3">
          {dayDisplayOrder.map((day) => (
            <div 
              key={day} 
              className={`p-3 md:p-4 rounded-lg border ${
                currentHours[day].closed ? 'bg-muted/50 border-border' : 'bg-card border-primary/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="w-full sm:w-32 font-medium text-sm sm:text-base">
                  {dayNames[day]}
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!currentHours[day].closed}
                    onCheckedChange={(checked) => updateCurrentDayHours(day, 'closed', !checked)}
                  />
                  <span className="text-sm text-muted-foreground w-20 sm:w-16">
                    {currentHours[day].closed ? 'Fechado' : 'Aberto'}
                  </span>
                </div>
                
                {!currentHours[day].closed && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-1">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">De:</Label>
                      <Input
                        type="time"
                        value={currentHours[day].open}
                        onChange={(e) => updateCurrentDayHours(day, 'open', e.target.value)}
                        className="w-full sm:w-28"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Até:</Label>
                      <Input
                        type="time"
                        value={currentHours[day].close}
                        onChange={(e) => updateCurrentDayHours(day, 'close', e.target.value)}
                        className="w-full sm:w-28"
                      />
                    </div>
                  </div>
                )}
                
                {currentHours[day].closed && (
                  <span className="text-sm text-muted-foreground italic">Fechado</span>
                )}
              </div>
              
              {/* Lunch Break Section - for shop and individual barbers */}
              {!currentHours[day].closed && (
                <div className="mt-3 pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-muted-foreground" />
                    <Switch
                      checked={currentHours[day].hasLunchBreak || false}
                      onCheckedChange={(checked) => updateCurrentDayHours(day, 'hasLunchBreak', checked)}
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      Horário de Almoço
                    </span>
                  </div>
                  
                  {currentHours[day].hasLunchBreak && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">De:</Label>
                        <Input
                          type="time"
                          value={currentHours[day].lunchStart || '12:00'}
                          onChange={(e) => updateCurrentDayHours(day, 'lunchStart', e.target.value)}
                          className="w-full sm:w-28"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Label className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Até:</Label>
                        <Input
                          type="time"
                          value={currentHours[day].lunchEnd || '13:00'}
                          onChange={(e) => updateCurrentDayHours(day, 'lunchEnd', e.target.value)}
                          className="w-full sm:w-28"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Show shop hours reference when editing barber hours */}
              {viewMode === 'barber' && !currentHours[day].closed && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Horário da barbearia: {hours[day].closed ? 'Fechado' : `${hours[day].open} - ${hours[day].close}`}
                    {hours[day].hasLunchBreak && ` (Almoço: ${hours[day].lunchStart} - ${hours[day].lunchEnd})`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            <strong>Preview:</strong> Como será exibido no site
          </p>
          <div className="bg-secondary/30 p-4 rounded-lg space-y-1 text-sm">
            {dayDisplayOrder.map((day) => (
              <div key={day} className="flex justify-between">
                <span className="text-muted-foreground">{dayNames[day]}</span>
                <div className="text-right">
                  <span className={currentHours[day].closed ? 'text-destructive' : 'text-foreground'}>
                    {currentHours[day].closed 
                      ? 'Fechado' 
                      : `${currentHours[day].open}–${currentHours[day].close}`
                    }
                  </span>
                  {viewMode === 'shop' && !currentHours[day].closed && currentHours[day].hasLunchBreak && (
                    <span className="text-muted-foreground ml-2">
                      (Almoço: {currentHours[day].lunchStart}–{currentHours[day].lunchEnd})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          {viewMode === 'shop' ? 'Salvar Horários da Barbearia' : 'Salvar Horários do Barbeiro'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OperatingHoursEditor;
