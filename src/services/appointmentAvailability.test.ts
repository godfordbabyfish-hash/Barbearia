import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpcMock, breaksMock } = vi.hoisted(() => ({ rpcMock: vi.fn(), breaksMock: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: rpcMock, from: () => ({ select: () => ({ eq: () => ({ eq: breaksMock }) }) }) },
}));

import { queryClient } from '@/lib/queryClient';
import {
  getBarberBusySlots,
  getBarberBreaks,
  invalidateBarberBreaks,
  invalidateBarberBusySlots,
} from './appointmentAvailability';

describe('appointment availability request caching', () => {
  beforeEach(() => {
    queryClient.clear();
    rpcMock.mockReset();
    breaksMock.mockReset();
    rpcMock.mockResolvedValue({
      data: [{ appointment_time: '09:00:00', duration: 45 }],
      error: null,
    });
  });

  it('does not cache failed break reads as successful availability data', async () => {
    const error = { message: 'temporary timeout' };
    breaksMock.mockResolvedValueOnce({ data: null, error });
    breaksMock.mockResolvedValueOnce({ data: [{ start_time: '12:00', end_time: '13:00' }], error: null });

    await expect(getBarberBreaks('barber-1', '2026-09-25')).rejects.toEqual(error);
    const result = await getBarberBreaks('barber-1', '2026-09-25');
    expect(breaksMock).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual([{ start_time: '12:00', end_time: '13:00' }]);
  });

  it('reuses the same recent availability response for repeated reads', async () => {
    const first = await getBarberBusySlots('barber-1', '2026-09-25');
    const second = await getBarberBusySlots('barber-1', '2026-09-25');

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(first[0]).toEqual({
      appointment_time: '09:00',
      service: { duration: 45 },
    });
  });

  it('refreshes availability when explicitly requested or invalidated', async () => {
    await getBarberBusySlots('barber-1', '2026-09-25');
    await getBarberBusySlots('barber-1', '2026-09-25', true);
    expect(rpcMock).toHaveBeenCalledTimes(2);

    invalidateBarberBusySlots('barber-1', '2026-09-25');
    await getBarberBusySlots('barber-1', '2026-09-25');
    expect(rpcMock).toHaveBeenCalledTimes(3);
  });

  it('refreshes pauses after an invalidation instead of retaining an old free slot', async () => {
    breaksMock.mockResolvedValueOnce({ data: [], error: null });
    breaksMock.mockResolvedValueOnce({ data: [{ start_time: '10:00', end_time: '10:30' }], error: null });

    const first = await getBarberBreaks('barber-1', '2026-09-25');
    const cached = await getBarberBreaks('barber-1', '2026-09-25');
    expect(first.data).toEqual([]);
    expect(cached.data).toEqual([]);
    expect(breaksMock).toHaveBeenCalledTimes(1);

    invalidateBarberBreaks('barber-1', '2026-09-25');
    const refreshed = await getBarberBreaks('barber-1', '2026-09-25');
    expect(refreshed.data).toEqual([{ start_time: '10:00', end_time: '10:30' }]);
    expect(breaksMock).toHaveBeenCalledTimes(2);
  });
});
