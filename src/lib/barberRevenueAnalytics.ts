export type BarberRevenueRow = {
  period_start: string;
  barber_id: string;
  barber_name: string;
  image_url: string | null;
  service_revenue: number;
  productive_minutes: number;
  available_minutes: number;
  booked_minutes: number;
  idle_minutes: number;
};

export type BarberRevenuePoint = {
  period_start: string;
  service_revenue: number;
  productive_minutes: number;
  available_minutes: number;
  booked_minutes: number;
  idle_minutes: number;
  estimated_opportunity: number;
  potential_revenue: number | null;
};

export type BarberRevenueSummary = {
  points: BarberRevenuePoint[];
  service_revenue: number;
  productive_minutes: number;
  available_minutes: number;
  booked_minutes: number;
  idle_minutes: number;
  estimated_opportunity: number;
  potential_revenue: number | null;
  has_projection_base: boolean;
  unestimated_idle_minutes: number;
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function buildBarberRevenueSummary(rows: BarberRevenueRow[]): BarberRevenueSummary {
  const selectedRows = rows || [];
  const productiveMinutes = selectedRows.reduce((sum, row) => sum + toNumber(row.productive_minutes), 0);
  const serviceRevenue = selectedRows.reduce((sum, row) => sum + toNumber(row.service_revenue), 0);
  const ratesByBarber = new Map<string, { revenue: number; productive: number }>();
  selectedRows.forEach((row) => {
    const current = ratesByBarber.get(row.barber_id) || { revenue: 0, productive: 0 };
    current.revenue += toNumber(row.service_revenue);
    current.productive += toNumber(row.productive_minutes);
    ratesByBarber.set(row.barber_id, current);
  });
  const hasProjectionBase = productiveMinutes > 0;
  let unestimatedIdleMinutes = 0;
  const byPeriod = new Map<string, BarberRevenuePoint>();

  selectedRows.forEach((row) => {
    const point = byPeriod.get(row.period_start) || {
      period_start: row.period_start,
      service_revenue: 0,
      productive_minutes: 0,
      available_minutes: 0,
      booked_minutes: 0,
      idle_minutes: 0,
      estimated_opportunity: 0,
      potential_revenue: null,
    };
    point.service_revenue += toNumber(row.service_revenue);
    point.productive_minutes += toNumber(row.productive_minutes);
    point.available_minutes += toNumber(row.available_minutes);
    point.booked_minutes += toNumber(row.booked_minutes);
    point.idle_minutes += Math.max(0, toNumber(row.idle_minutes));
    const barberRate = ratesByBarber.get(row.barber_id);
    if (barberRate && barberRate.productive > 0) {
      point.estimated_opportunity += roundMoney(Math.max(0, toNumber(row.idle_minutes)) * barberRate.revenue / barberRate.productive);
    } else {
      unestimatedIdleMinutes += Math.max(0, toNumber(row.idle_minutes));
    }
    byPeriod.set(row.period_start, point);
  });

  const points = Array.from(byPeriod.values()).sort((a, b) => a.period_start.localeCompare(b.period_start));
  points.forEach((point) => {
    point.estimated_opportunity = roundMoney(point.estimated_opportunity);
    point.potential_revenue = hasProjectionBase
      ? roundMoney(point.service_revenue + point.estimated_opportunity)
      : null;
    point.service_revenue = roundMoney(point.service_revenue);
  });

  const availableMinutes = selectedRows.reduce((sum, row) => sum + toNumber(row.available_minutes), 0);
  const bookedMinutes = selectedRows.reduce((sum, row) => sum + toNumber(row.booked_minutes), 0);
  const idleMinutes = selectedRows.reduce((sum, row) => sum + Math.max(0, toNumber(row.idle_minutes)), 0);
  const estimatedOpportunity = points.reduce((sum, point) => sum + point.estimated_opportunity, 0);

  return {
    points,
    service_revenue: roundMoney(serviceRevenue),
    productive_minutes: productiveMinutes,
    available_minutes: availableMinutes,
    booked_minutes: bookedMinutes,
    idle_minutes: idleMinutes,
    estimated_opportunity: estimatedOpportunity,
    potential_revenue: hasProjectionBase ? roundMoney(serviceRevenue + estimatedOpportunity) : null,
    has_projection_base: hasProjectionBase,
    unestimated_idle_minutes: unestimatedIdleMinutes,
  };
}
