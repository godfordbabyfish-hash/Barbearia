export interface ServiceReportInput {
  servicePrice: number;
  originalPrice: number | null;
  finalPrice: number | null;
  commissionBasis: string | null;
  payments: number[];
  capturedPercentage?: number | null;
  individualPercentage?: number;
  fixedPercentage?: number;
}

export interface ServiceReportAmount {
  received: number;
  commissionBase: number;
  commissionPercentage: number;
  commission: number;
}

export function calculateServiceReportAmount(input: ServiceReportInput): ServiceReportAmount {
  const paidTotal = input.payments.reduce((sum, amount) => sum + Number(amount || 0), 0);
  const received = input.finalPrice !== null
    ? Number(input.finalPrice)
    : paidTotal > 0
      ? paidTotal
      : Number(input.servicePrice);
  const commissionBase = input.commissionBasis === 'original'
    ? Number(input.originalPrice ?? input.servicePrice)
    : received;
  // An explicit 0% individual rule must not fall back to the fixed rate.
  const commissionPercentage = Number(input.capturedPercentage ?? input.individualPercentage ?? input.fixedPercentage ?? 0);

  return {
    received,
    commissionBase,
    commissionPercentage,
    commission: commissionBase * commissionPercentage / 100,
  };
}
