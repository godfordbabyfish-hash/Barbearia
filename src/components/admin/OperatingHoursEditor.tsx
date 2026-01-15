import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Clock, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { 
  useOperatingHours, 
  defaultOperatingHours, 
  dayNames, 
  OperatingHours,
  DayHours 
} from '@/hooks/useOperatingHours';

const dayDisplayOrder: (keyof OperatingHours)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const OperatingHoursEditor = () => {
  const { operatingHours, saveOperatingHours, loading } = useOperatingHours();
  const [hours, setHours] = useState<OperatingHours>(defaultOperatingHours);

  useEffect(() => {
    if (!loading) {
      setHours(operatingHours);
    }
  }, [operatingHours, loading]);

  const updateDayHours = (day: keyof OperatingHours, field: keyof DayHours, value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    const { error } = await saveOperatingHours(hours);
    if (error) {
      toast.error('Erro ao salvar horários');
    } else {
      toast.success('Horários de funcionamento salvos!');
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Horário de Funcionamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground mb-4">
          Configure os horários de abertura e fechamento para cada dia. Esses horários serão usados para determinar os slots disponíveis para agendamento.
        </p>
        
        <div className="space-y-3">
          {dayDisplayOrder.map((day) => (
            <div 
              key={day} 
              className={`p-3 rounded-lg border ${
                hours[day].closed ? 'bg-muted/50 border-border' : 'bg-card border-primary/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-32 font-medium">
                  {dayNames[day]}
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!hours[day].closed}
                    onCheckedChange={(checked) => updateDayHours(day, 'closed', !checked)}
                  />
                  <span className="text-sm text-muted-foreground w-16">
                    {hours[day].closed ? 'Fechado' : 'Aberto'}
                  </span>
                </div>
                
                {!hours[day].closed && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">De:</Label>
                      <Input
                        type="time"
                        value={hours[day].open}
                        onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                        className="w-28"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Até:</Label>
                      <Input
                        type="time"
                        value={hours[day].close}
                        onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                        className="w-28"
                      />
                    </div>
                  </div>
                )}
                
                {hours[day].closed && (
                  <span className="text-muted-foreground italic">Fechado</span>
                )}
              </div>
              
              {/* Lunch Break Section */}
              {!hours[day].closed && (
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-muted-foreground" />
                    <Switch
                      checked={hours[day].hasLunchBreak || false}
                      onCheckedChange={(checked) => updateDayHours(day, 'hasLunchBreak', checked)}
                    />
                    <span className="text-sm text-muted-foreground">
                      Horário de Almoço
                    </span>
                  </div>
                  
                  {hours[day].hasLunchBreak && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">De:</Label>
                        <Input
                          type="time"
                          value={hours[day].lunchStart || '12:00'}
                          onChange={(e) => updateDayHours(day, 'lunchStart', e.target.value)}
                          className="w-28"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Até:</Label>
                        <Input
                          type="time"
                          value={hours[day].lunchEnd || '13:00'}
                          onChange={(e) => updateDayHours(day, 'lunchEnd', e.target.value)}
                          className="w-28"
                        />
                      </div>
                    </div>
                  )}
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
                  <span className={hours[day].closed ? 'text-destructive' : 'text-foreground'}>
                    {hours[day].closed 
                      ? 'Fechado' 
                      : `${hours[day].open}–${hours[day].close}`
                    }
                  </span>
                  {!hours[day].closed && hours[day].hasLunchBreak && (
                    <span className="text-muted-foreground ml-2">
                      (Almoço: {hours[day].lunchStart}–{hours[day].lunchEnd})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Salvar Horários
        </Button>
      </CardContent>
    </Card>
  );
};

export default OperatingHoursEditor;
