import { addDays, format, getDay, isAfter, isBefore, isSameDay, startOfDay, startOfWeek, subWeeks } from 'date-fns';

export interface FinancialWeek {
  number: number;
  start: Date;
  end: Date;
  startISO: string;
  endISO: string;
  label: string;
}

export function getCurrentFinancialCompetence(now = new Date()) {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const year = Number(format(monday, 'yyyy'));
  const month = Number(format(monday, 'M'));
  const weeks = listFinancialWeeks(year, month);
  const week = weeks.find((item) => item.startISO === format(monday, 'yyyy-MM-dd')) || weeks[0];

  return { year, month, weekNumber: week?.number || 1 };
}

export function listRecentFinancialWeeks(count = 12, now = new Date()): FinancialWeek[] {
  const currentMonday = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: count }, (_, index) => {
    const monday = subWeeks(currentMonday, index);
    const sunday = addDays(monday, 6);
    return {
      number: 0,
      start: monday,
      end: sunday,
      startISO: format(monday, 'yyyy-MM-dd'),
      endISO: format(sunday, 'yyyy-MM-dd'),
      label: `${format(monday, 'dd/MM/yyyy')} a ${format(sunday, 'dd/MM/yyyy')}${index === 0 ? ' (Semana atual)' : ''}`,
    };
  });
}

export function listFinancialWeeks(year: number, month: number): FinancialWeek[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const firstMonday = addDays(first, (8 - getDay(first)) % 7);
  const weeks: FinancialWeek[] = [];

  for (let monday = firstMonday; !isAfter(monday, last); monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    weeks.push({
      number: weeks.length + 1,
      start: monday,
      end: sunday,
      startISO: format(monday, 'yyyy-MM-dd'),
      endISO: format(sunday, 'yyyy-MM-dd'),
      label: `Semana ${weeks.length + 1} — ${format(monday, 'dd/MM')} a ${format(sunday, 'dd/MM')}`,
    });
  }

  return weeks;
}

export type WeekAvailability = 'closed' | 'preview' | 'open';

export function getWeekAvailability(week: FinancialWeek, now = new Date()): WeekAvailability {
  const today = startOfDay(now);
  if (isAfter(today, week.end)) return 'closed';
  if ((isSameDay(today, week.end) || isSameDay(today, addDays(week.end, -1))) && !isBefore(today, week.start)) {
    return 'preview';
  }
  return 'open';
}
