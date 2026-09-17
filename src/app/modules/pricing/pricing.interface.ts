export interface IPricingPayload {
  vehicleId?: string | null;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  chauffeurRate: number;
  securityDeposit: number;
  deliveryCollectionCharge: number;
  airportPickupDropCharge: number;
  gpsCharge: number;
  fullInsuranceCharge: number;
  additionalDriverCharge: number;
  childSeatCharge: number;
  discountPercentage?: number;
  discountValidFrom?: Date | string | null;
  discountValidUntil?: Date | string | null;
}
