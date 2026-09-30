import type { DayHours } from '@/hooks/useOperatingHours';

type Break = { start_time: string; end_time: string };

type MonthlyHours = {
  open: string;
  close: string;
  closed: boolean;
  has_lunch?: boolean;
  lunch_start?: string;
  lunch_end?: string;
  has_pause?: boolean;
  pause_start?: string;
  pause_end?: string;
};

export function resolveQuickBookingHours(
  monthly: MonthlyHours | null,
  weekly: DayHours | null | undefined,
  shop: DayHours,
): { open: string; close: string; closed: boolean; breaks: Break[] } {
  const trim = (time: string) => time.slice(0, 5);
  if (monthly) {
    return {
      open: trim(monthly.open),
      close: trim(monthly.close),
      closed: Boolean(monthly.closed),
      breaks: [
        ...(monthly.has_lunch && monthly.lunch_start && monthly.lunch_end
          ? [{ start_time: trim(monthly.lunch_start), end_time: trim(monthly.lunch_end) }] : []),
        ...(monthly.has_pause && monthly.pause_start && monthly.pause_end
          ? [{ start_time: trim(monthly.pause_start), end_time: trim(monthly.pause_end) }] : []),
      ],
    };
  }
  const hours = weekly ?? shop;
  return {
    open: hours.open || shop.open,
    close: hours.close || shop.close,
    closed: Boolean(hours.closed),
    breaks: hours.hasLunchBreak && hours.lunchStart && hours.lunchEnd
      ? [{ start_time: hours.lunchStart, end_time: hours.lunchEnd }] : [],
  };
}
