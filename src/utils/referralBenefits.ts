export type ReferralCouponSummary = {
  count: number;
  maxPercent: number;
  maxCredit: number;
  nextExpiration: string | null;
};

type ReferralCouponLike = {
  discount_percent?: number | string | null;
  discount_amount_limit?: number | string | null;
  expires_at?: string | null;
};

export const getReferralCouponCredit = (coupon: ReferralCouponLike, creditBase = 25) => {
  const percent = Math.max(0, Math.min(100, Number(coupon.discount_percent || 0)));
  const storedLimit = Number(coupon.discount_amount_limit);
  return Number((Number.isFinite(storedLimit) && storedLimit > 0
    ? storedLimit
    : Number(creditBase || 25) * percent / 100).toFixed(2));
};

export const summarizeReferralCoupons = (
  coupons: ReferralCouponLike[],
  creditBase = 25,
): ReferralCouponSummary | null => {
  if (!coupons.length) return null;

  const sortedExpirations = coupons
    .map((coupon) => coupon.expires_at)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    count: coupons.length,
    maxPercent: Math.max(...coupons.map((coupon) => Number(coupon.discount_percent || 0))),
    maxCredit: Math.max(...coupons.map((coupon) => getReferralCouponCredit(coupon, creditBase))),
    nextExpiration: sortedExpirations[0] || null,
  };
};
