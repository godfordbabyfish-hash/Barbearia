import { describe, expect, it } from 'vitest';
import { calculateReferralPrice, referralCommissionBase } from './referrals';

describe('referral pricing', () => {
  it('applies a 50% coupon once', () => {
    expect(calculateReferralPrice(40, 50)).toEqual({ original: 40, discount: 20, final: 20 });
  });
  it('rounds currency and clamps invalid percentages', () => {
    expect(calculateReferralPrice(39.99, 50)).toEqual({ original: 39.99, discount: 20, final: 19.99 });
    expect(calculateReferralPrice(40, 150).final).toBe(0);
  });
  it('honors the configured commission basis', () => {
    expect(referralCommissionBase(40, 20, 'original')).toBe(40);
    expect(referralCommissionBase(40, 20, 'final')).toBe(20);
  });
});
