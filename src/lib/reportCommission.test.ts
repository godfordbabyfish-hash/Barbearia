import { describe, expect, it } from 'vitest';
import { calculateServiceReportAmount } from './reportCommission';

const base = {
  servicePrice: 25,
  originalPrice: null,
  finalPrice: null,
  commissionBasis: null,
  payments: [],
};

describe('calculateServiceReportAmount', () => {
  it('uses the individual percentage instead of a fixed 50%', () => {
    expect(calculateServiceReportAmount({ ...base, individualPercentage: 40, fixedPercentage: 50 }))
      .toMatchObject({ received: 25, commissionPercentage: 40, commission: 10 });
  });

  it('preserves the percentage captured on completion after panel edits', () => {
    expect(calculateServiceReportAmount({ ...base, capturedPercentage: 40, individualPercentage: 55, fixedPercentage: 60 }))
      .toMatchObject({ received: 25, commissionPercentage: 40, commission: 10 });
    expect(calculateServiceReportAmount({ ...base, capturedPercentage: 0, individualPercentage: 55 }))
      .toMatchObject({ commissionPercentage: 0, commission: 0 });
  });

  it('uses the fixed rate only when no individual rule exists', () => {
    expect(calculateServiceReportAmount({ ...base, fixedPercentage: 35 }).commission).toBe(8.75);
    expect(calculateServiceReportAmount({ ...base, individualPercentage: 0, fixedPercentage: 35 }).commission).toBe(0);
  });

  it('uses the final received value for discounted services', () => {
    expect(calculateServiceReportAmount({ ...base, originalPrice: 25, finalPrice: 12.5, individualPercentage: 40 }))
      .toMatchObject({ received: 12.5, commissionBase: 12.5, commission: 5 });
  });

  it('honours the original-price commission basis even for a free service', () => {
    expect(calculateServiceReportAmount({ ...base, originalPrice: 25, finalPrice: 0, commissionBasis: 'original', individualPercentage: 40 }))
      .toMatchObject({ received: 0, commissionBase: 25, commission: 10 });
  });

  it('uses registered split payments when no final price was saved', () => {
    expect(calculateServiceReportAmount({ ...base, finalPrice: null, payments: [10, 15], individualPercentage: 40 }))
      .toMatchObject({ received: 25, commission: 10 });
  });

  it('keeps the service price for completed legacy appointments without payment fields', () => {
    expect(calculateServiceReportAmount({ ...base, individualPercentage: 40 }))
      .toMatchObject({ received: 25, commission: 10 });
  });
});
