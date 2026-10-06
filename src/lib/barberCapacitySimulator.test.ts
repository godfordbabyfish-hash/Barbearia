import { describe, expect, it } from 'vitest';
import { calculateBarberCapacity } from './barberCapacitySimulator';

describe('calculateBarberCapacity', () => {
  it('projects Monday through Saturday with one weekly day off', () => {
    expect(calculateBarberCapacity({
      month: '2026-10',
      workingWeekdays: [1, 2, 3, 4, 5, 6],
      startTime: '09:00',
      endTime: '20:00',
      breakMinutes: 60,
      averageServiceMinutes: 30,
      averageTicket: 35,
      occupancyPercent: 100,
      commissionPercent: 40,
    })).toEqual({
      workingDays: 27,
      dailyAvailableMinutes: 600,
      monthlyAvailableMinutes: 16200,
      estimatedAppointments: 540,
      projectedRevenue: 18900,
      estimatedCommission: 7560,
      barbershopRevenueAfterCommission: 11340,
    });
  });

  it('applies the occupancy target before calculating appointments', () => {
    const result = calculateBarberCapacity({
      month: '2026-10', workingWeekdays: [1], startTime: '09:00', endTime: '10:00',
      breakMinutes: 0, averageServiceMinutes: 30, averageTicket: 40, occupancyPercent: 50, commissionPercent: 50,
    });
    expect(result.workingDays).toBe(4);
    expect(result.estimatedAppointments).toBe(4);
    expect(result.projectedRevenue).toBe(160);
    expect(result.estimatedCommission).toBe(80);
    expect(result.barbershopRevenueAfterCommission).toBe(80);
  });

  it('returns zero for an invalid schedule', () => {
    expect(calculateBarberCapacity({
      month: '2026-10', workingWeekdays: [1], startTime: '20:00', endTime: '09:00',
      breakMinutes: 0, averageServiceMinutes: 30, averageTicket: 40, occupancyPercent: 100, commissionPercent: 50,
    }).projectedRevenue).toBe(0);
  });
});
