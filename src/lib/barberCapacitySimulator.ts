import { eachDayOfInterval, endOfMonth, getDay, startOfMonth } from 'date-fns';

export type BarberCapacitySimulationInput = {
  month: string;
  workingWeekdays: number[];
  startTime: string;
  endTime: string;
  breakMinutes: number;
  averageServiceMinutes: number;
  averageTicket: number;
  occupancyPercent: number;
  commissionPercent: number;
};

export type BarberCapacitySimulation = {
  workingDays: number;
  dailyAvailableMinutes: number;
  monthlyAvailableMinutes: number;
  estimatedAppointments: number;
  projectedRevenue: number;
  estimatedCommission: number;
  barbershopRevenueAfterCommission: number;
};

const parseTime = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export function calculateBarberCapacity(input: BarberCapacitySimulationInput): BarberCapacitySimulation {
  const empty = { workingDays: 0, dailyAvailableMinutes: 0, monthlyAvailableMinutes: 0, estimatedAppointments: 0, projectedRevenue: 0, estimatedCommission: 0, barbershopRevenueAfterCommission: 0 };
  if (!/^\d{4}-\d{2}$/.test(input.month)) return empty;
  const monthDate = new Date(`${input.month}-01T12:00:00`);
  const startMinutes = parseTime(input.startTime);
  const endMinutes = parseTime(input.endTime);
  if (Number.isNaN(monthDate.getTime()) || startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return empty;

  const selectedDays = new Set(input.workingWeekdays);
  const workingDays = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) })
    .filter((date) => selectedDays.has(getDay(date))).length;
  const dailyAvailableMinutes = Math.max(0, endMinutes - startMinutes - Math.max(0, input.breakMinutes || 0));
  const monthlyAvailableMinutes = workingDays * dailyAvailableMinutes;
  const occupancy = Math.min(100, Math.max(0, input.occupancyPercent || 0)) / 100;
  const averageServiceMinutes = Math.max(1, input.averageServiceMinutes || 0);
  const estimatedAppointments = Math.floor(monthlyAvailableMinutes * occupancy / averageServiceMinutes);
  const projectedRevenue = Math.round(estimatedAppointments * Math.max(0, input.averageTicket || 0) * 100) / 100;
  const commissionRate = Math.min(100, Math.max(0, input.commissionPercent || 0)) / 100;
  const estimatedCommission = Math.round(projectedRevenue * commissionRate * 100) / 100;
  const barbershopRevenueAfterCommission = Math.round((projectedRevenue - estimatedCommission) * 100) / 100;

  return { workingDays, dailyAvailableMinutes, monthlyAvailableMinutes, estimatedAppointments, projectedRevenue, estimatedCommission, barbershopRevenueAfterCommission };
}
