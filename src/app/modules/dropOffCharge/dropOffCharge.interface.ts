import type { ChargeType, DropOffChargeStatus, VehicleCategory } from '@prisma/client';

export interface ICreateDropOffChargePayload {
  pickupLocationId: string;
  dropOffLocationId: string;
  vehicleCategory?: VehicleCategory;
  vehicleId?: string;
  chargeType?: ChargeType;
  amount: number;
  seasonalMultiplier?: number;
  status?: DropOffChargeStatus;
}

export type IUpdateDropOffChargePayload = Partial<ICreateDropOffChargePayload>;

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
