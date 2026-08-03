import { CalendarDays } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listRecentFinancialWeeks } from '@/lib/financialWeek';

interface WeeklyOverviewSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function WeeklyOverviewSelector({ value, onChange }: WeeklyOverviewSelectorProps) {
  const weeks = listRecentFinancialWeeks();
  return (
    <div className="col-span-full rounded-lg border border-primary/20 bg-primary/5 p-3">
      <Label className="mb-2 flex items-center gap-2 text-sm">
        <CalendarDays className="h-4 w-4 text-primary" /> Semana do relatório
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{weeks.map((week) => <SelectItem key={week.startISO} value={week.startISO}>{week.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
