import type { ChargeType, DropOffChargeStatus, VehicleCategory } from '@prisma/client';

export interface ICreateDropOffChargePayload {
  pickupLocationId: string;
  dropOffLocationId: string;
  vehicleCategory?: VehicleCategory;
  vehicleId?: string;
  chargeType?: ChargeType;
  amount: number;
  distanceKm?: number;
  seasonalMultiplier?: number;
  status?: DropOffChargeStatus;
}

export type IUpdateDropOffChargePayload = Omit<
  Partial<ICreateDropOffChargePayload>,
  'distanceKm'
> & { distanceKm?: number | null };

export interface IDropOffChargeQuery {
  searchTerm?: string;
  pickupLocationId?: string;
  dropOffLocationId?: string;
  vehicleCategory?: VehicleCategory;
  vehicleId?: string;
  chargeType?: ChargeType;
  status?: DropOffChargeStatus;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
