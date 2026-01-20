/**
 * Utility functions for calculating barber commissions
 */

/**
 * Calculate the commission value based on percentage and service price
 * @param percentage - Commission percentage (0-100)
 * @param servicePrice - Price of the service
 * @returns The commission value
 */
export const calculateCommissionValue = (percentage: number, servicePrice: number): number => {
  if (!percentage || percentage === 0) return 0;
  if (!servicePrice || servicePrice === 0) return 0;
  
  return (servicePrice * percentage) / 100;
};

/**
 * Get commission percentage for a barber and service
 * @param commissions - Array of commission objects with barber_id, service_id, and commission_percentage
 * @param barberId - ID of the barber
 * @param serviceId - ID of the service
 * @param defaultPercentage - Default percentage to return if not found (default: 0)
 * @returns Commission percentage (0-100) or default value
 */
export const getCommissionPercentage = (
  commissions: Array<{ barber_id: string; service_id: string; commission_percentage: number }> | null | undefined,
  barberId: string | null | undefined,
  serviceId: string | null | undefined,
  defaultPercentage: number = 0
): number => {
  if (!commissions || !barberId || !serviceId) {
    return defaultPercentage;
  }

  const commission = commissions.find(
    c => c.barber_id === barberId && c.service_id === serviceId
  );

  return commission?.commission_percentage ?? defaultPercentage;
};

/**
 * Calculate commission value for a specific barber and service
 * @param commissions - Array of commission objects
 * @param barberId - ID of the barber
 * @param serviceId - ID of the service
 * @param servicePrice - Price of the service
 * @param defaultPercentage - Default percentage if not found (default: 0)
 * @returns The commission value
 */
export const calculateCommissionForService = (
  commissions: Array<{ barber_id: string; service_id: string; commission_percentage: number }> | null | undefined,
  barberId: string | null | undefined,
  serviceId: string | null | undefined,
  servicePrice: number,
  defaultPercentage: number = 0
): number => {
  const percentage = getCommissionPercentage(commissions, barberId, serviceId, defaultPercentage);
  return calculateCommissionValue(percentage, servicePrice);
};
