import { describe, expect, it } from 'vitest';
import { buildBarberRevenueSummary, buildFullCapacityProjection, type BarberRevenueRow } from './barberRevenueAnalytics';

const row = (overrides: Partial<BarberRevenueRow> = {}): BarberRevenueRow => ({
  period_start: '2026-09-01',
  barber_id: 'barber-1',
  barber_name: 'Barbeiro Um',
  image_url: null,
  service_revenue: 100,
  productive_minutes: 60,
  available_minutes: 480,
  booked_minutes: 60,
  idle_minutes: 420,
  ...overrides,
});

describe('buildFullCapacityProjection', () => {
  it('projects a full month using each barber own observed revenue rate', () => {
    const observed = [
      row({ barber_id: 'a', service_revenue: 600, productive_minutes: 600, available_minutes: 900 }),
      row({ barber_id: 'b', service_revenue: 300, productive_minutes: 300, available_minutes: 600 }),
    ];
    const capacity = [
      row({ barber_id: 'a', available_minutes: 6000 }),
      row({ barber_id: 'b', available_minutes: 3000 }),
    ];

    expect(buildFullCapacityProjection(observed, capacity)).toEqual({
      projected_revenue: 9000,
      full_capacity_minutes: 9000,
      unestimated_capacity_minutes: 0,
      has_projection_base: true,
    });
  });

  it('keeps capacity without completed services out of the monetary estimate', () => {
    const observed = [row({ barber_id: 'a', service_revenue: 300, productive_minutes: 300 })];
    const capacity = [
      row({ barber_id: 'a', available_minutes: 3000 }),
      row({ barber_id: 'b', available_minutes: 1200 }),
    ];

    expect(buildFullCapacityProjection(observed, capacity)).toEqual({
      projected_revenue: 3000,
      full_capacity_minutes: 4200,
      unestimated_capacity_minutes: 1200,
      has_projection_base: true,
    });
  });
});

describe('buildBarberRevenueSummary', () => {
  it('soma a oportunidade individual de cada barbeiro sem misturar taxas', () => {
    const summary = buildBarberRevenueSummary([
      row({ idle_minutes: 30 }),
      row({ barber_id: 'barber-2', barber_name: 'Barbeiro Dois', service_revenue: 30, productive_minutes: 30, idle_minutes: 30 }),
    ]);

    expect(summary.service_revenue).toBe(130);
    expect(summary.idle_minutes).toBe(60);
    expect(summary.estimated_opportunity).toBe(80);
    expect(summary.potential_revenue).toBe(210);
    expect(summary.points).toHaveLength(1);
    const separate = [
      buildBarberRevenueSummary([row({ idle_minutes: 30 })]),
      buildBarberRevenueSummary([row({ barber_id: 'barber-2', service_revenue: 30, productive_minutes: 30, idle_minutes: 30 })]),
    ];
    expect(summary.estimated_opportunity).toBe(separate.reduce((sum, item) => sum + item.estimated_opportunity, 0));
  });

  it('calcula potencial para cada período com a taxa do intervalo selecionado', () => {
    const summary = buildBarberRevenueSummary([
      row({ period_start: '2026-09-01', service_revenue: 100, productive_minutes: 60, idle_minutes: 30 }),
      row({ period_start: '2026-09-02', service_revenue: 0, productive_minutes: 0, idle_minutes: 30 }),
    ]);

    expect(summary.points[0].estimated_opportunity).toBe(50);
    expect(summary.points[0].potential_revenue).toBe(150);
    expect(summary.points[1].estimated_opportunity).toBe(50);
    expect(summary.points[1].potential_revenue).toBe(50);
  });

  it('não apresenta uma estimativa quando não há minutos produtivos no intervalo', () => {
    const summary = buildBarberRevenueSummary([
      row({ service_revenue: 0, productive_minutes: 0, idle_minutes: 300 }),
    ]);

    expect(summary.has_projection_base).toBe(false);
    expect(summary.estimated_opportunity).toBe(0);
    expect(summary.potential_revenue).toBeNull();
    expect(summary.points[0].potential_revenue).toBeNull();
  });

  it('não aplica taxa de outro barbeiro à cadeira sem histórico', () => {
    const summary = buildBarberRevenueSummary([
      row({ idle_minutes: 30 }),
      row({ barber_id: 'barber-2', service_revenue: 0, productive_minutes: 0, idle_minutes: 240 }),
    ]);
    expect(summary.estimated_opportunity).toBe(50);
    expect(summary.unestimated_idle_minutes).toBe(240);
  });
});
