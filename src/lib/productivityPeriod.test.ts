import { describe, expect, it } from 'vitest';
import { getProductivityMonthRange } from './productivityPeriod';

describe('getProductivityMonthRange', () => {
  const now = new Date('2026-10-06T12:00:00');

  it('uses the complete selected month when it is in the past', () => {
    expect(getProductivityMonthRange('2026-08', now)).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('ends the current month on today', () => {
    expect(getProductivityMonthRange('2026-10', now)).toEqual({
      from: '2026-10-01',
      to: '2026-10-06',
    });
  });

  it('rejects future and invalid months', () => {
    expect(getProductivityMonthRange('2026-11', now)).toBeNull();
    expect(getProductivityMonthRange('2026-13', now)).toBeNull();
    expect(getProductivityMonthRange('', now)).toBeNull();
  });
});
