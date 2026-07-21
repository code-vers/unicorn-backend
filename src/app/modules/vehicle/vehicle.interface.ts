import type {
  VehicleAvailability,
  VehicleCategory,
  VehicleFuelType,
  VehicleStatus,
  VehicleTransmission
} from '@prisma/client';

export interface IVehicleImagePayload {
  path: string;
  order?: number;
}

export interface ICreateVehiclePayload {
  name: string;
  category: VehicleCategory;
  brand: string;
  year: number;
  transmission: VehicleTransmission;
  fuelType: VehicleFuelType;
  seatingCapacity: number;
  luggageCapacity?: number | null;
  description?: string | null;
  features?: string[];
  status?: VehicleStatus;
  availability?: VehicleAvailability;
  isFeatured?: boolean;
  locationId: string;
}

export type IUpdateVehiclePayload = Partial<ICreateVehiclePayload>;

export interface IUpdateAvailabilityPayload {
  availability: VehicleAvailability;
}

export interface IVehicleQuery {
  searchTerm?: string;
  category?: VehicleCategory;
  transmission?: VehicleTransmission;
  fuelType?: VehicleFuelType;
  locationId?: string;
  availability?: VehicleAvailability;
  status?: VehicleStatus;
  isFeatured?: boolean | string;
  minPrice?: number | string;
  maxPrice?: number | string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IVehicleImageResponse {
  id: string;
  path: string;
  order: number;
}

export interface ILocationBasicResponse {
  id: string;
  name: string;
  city: string;
}

export interface IVehicleResponse {
  id: string;
  name: string;
  category: VehicleCategory;
  brand: string;
  year: number;
  transmission: VehicleTransmission;
  fuelType: VehicleFuelType;
  seatingCapacity: number;
  luggageCapacity: number | null;
  description: string | null;
  features: string[];
  status: VehicleStatus;
  availability: VehicleAvailability;
  isFeatured: boolean;
  locationId: string;
  createdAt: Date;
  updatedAt: Date;
  images?: IVehicleImageResponse[];
  location?: ILocationBasicResponse;
}
