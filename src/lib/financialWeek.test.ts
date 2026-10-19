import { describe, expect, it } from 'vitest';
import { getFinancialTimestampRange } from './financialWeek';

describe('getFinancialTimestampRange', () => {
  it('uses São Paulo midnight and an exclusive end boundary', () => {
    expect(getFinancialTimestampRange('2026-10-19', '2026-10-25')).toEqual({
      start: '2026-10-19T03:00:00.000Z',
      endExclusive: '2026-10-26T03:00:00.000Z',
    });
  });

  it('includes approval time on the final day and excludes the next week', () => {
    const range = getFinancialTimestampRange('2026-10-19', '2026-10-25');
    const oldApprovalTimestampFromOct2 = Date.parse('2026-10-02T23:52:27.685137Z');
    const approvalAtEndOfOct25 = Date.parse('2026-10-26T02:59:59.999Z');
    const approvalFromNextWeek = Date.parse('2026-10-26T03:00:00.000Z');

    expect(oldApprovalTimestampFromOct2).toBeLessThan(Date.parse(range.start));
    expect(approvalAtEndOfOct25).toBeGreaterThanOrEqual(Date.parse(range.start));
    expect(approvalAtEndOfOct25).toBeLessThan(Date.parse(range.endExclusive));
    expect(approvalFromNextWeek).toBe(Date.parse(range.endExclusive));
  });
});
