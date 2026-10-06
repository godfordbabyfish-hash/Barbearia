import { endOfMonth, format, startOfMonth } from 'date-fns';

export type DateRange = { from: string; to: string };

export function getProductivityMonthRange(month: string, now = new Date()): DateRange | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;

  const monthNumber = Number(month.slice(5, 7));
  const currentMonth = format(now, 'yyyy-MM');
  if (monthNumber < 1 || monthNumber > 12 || month > currentMonth) return null;

  const selected = new Date(`${month}-01T12:00:00`);
  if (Number.isNaN(selected.getTime())) return null;

  const end = endOfMonth(selected);
  return {
    from: format(startOfMonth(selected), 'yyyy-MM-dd'),
    to: format(month === currentMonth ? now : end, 'yyyy-MM-dd'),
  };
}
