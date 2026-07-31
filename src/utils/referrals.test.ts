import { describe, expect, it } from 'vitest';
import { calculateReferralPrice, referralCommissionBase } from './referrals';

describe('referral pricing', () => {
  it('applies a capped referral credit once', () => {
    expect(calculateReferralPrice(45, 50, 12.5)).toEqual({ original: 45, discount: 12.5, final: 32.5 });
    expect(calculateReferralPrice(10, 50, 12.5)).toEqual({ original: 10, discount: 10, final: 0 });
  });
  it('keeps percentage calculation for legacy coupons without a monetary limit', () => {
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
