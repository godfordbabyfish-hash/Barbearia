export type CommissionBasis = 'original' | 'final';

export function calculateReferralPrice(
  originalPrice: number,
  discountPercent = 0,
  discountAmountLimit?: number | null,
) {
  const original = Math.max(0, Number(originalPrice) || 0);
  const percent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const configuredLimit = Number(discountAmountLimit);
  const calculatedDiscount = original * percent / 100;
  const discount = Number((
    Number.isFinite(configuredLimit) && configuredLimit > 0
      ? Math.min(original, configuredLimit)
      : Math.min(original, calculatedDiscount)
  ).toFixed(2));
  return { original, discount, final: Number((original - discount).toFixed(2)) };
}

export function referralCommissionBase(original: number, final: number, basis: CommissionBasis) {
  return basis === 'original' ? original : final;
}
