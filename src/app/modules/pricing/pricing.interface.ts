export interface IPricingPayload {
  vehicleId?: string | null;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  selfDriveRate: number;
  chauffeurRate: number;
  seasonalMultiplier?: number;
  extraDayCharge: number;
  lateReturnHourlyCharge: number;
  securityDeposit: number;
  deliveryCollectionCharge: number;
  airportPickupDropCharge: number;
  extraMileageCharge: number;
  gpsCharge?: number;
  fullInsuranceCharge?: number;
  additionalDriverCharge?: number;
  childSeatCharge?: number;
  discountPercentage?: number;
  discountValidUntil?: Date | string;
}
