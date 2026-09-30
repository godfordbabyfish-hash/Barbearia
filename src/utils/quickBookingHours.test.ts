import { describe, expect, it } from 'vitest';
import { resolveQuickBookingHours } from './quickBookingHours';

const shop = { open: '09:00', close: '18:00', closed: false, hasLunchBreak: true, lunchStart: '12:00', lunchEnd: '13:00' };
const weekly = { open: '10:00', close: '17:00', closed: false, hasLunchBreak: true, lunchStart: '13:00', lunchEnd: '14:00' };

describe('resolveQuickBookingHours', () => {
  it('prioriza dia fechado da escala mensal sobre o semanal aberto', () => {
    expect(resolveQuickBookingHours({ open: '09:00:00', close: '18:00:00', closed: true }, weekly, shop).closed).toBe(true);
  });

  it('usa expediente, almoço e pausa da escala mensal', () => {
    expect(resolveQuickBookingHours({
      open: '08:00:00', close: '16:00:00', closed: false,
      has_lunch: true, lunch_start: '11:30:00', lunch_end: '12:30:00',
      has_pause: true, pause_start: '15:00:00', pause_end: '15:30:00',
    }, weekly, shop)).toEqual({
      open: '08:00', close: '16:00', closed: false,
      breaks: [{ start_time: '11:30', end_time: '12:30' }, { start_time: '15:00', end_time: '15:30' }],
    });
  });

  it('usa o horário semanal atual quando não há escala mensal', () => {
    expect(resolveQuickBookingHours(null, weekly, shop).open).toBe('10:00');
    expect(resolveQuickBookingHours(null, weekly, shop).breaks).toEqual([{ start_time: '13:00', end_time: '14:00' }]);
  });

  it('recorre ao horário da loja sem escala do barbeiro', () => {
    expect(resolveQuickBookingHours(null, null, shop).close).toBe('18:00');
  });
});
