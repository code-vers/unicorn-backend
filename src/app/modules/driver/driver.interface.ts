import type { DriverAvailability } from '@prisma/client';

export interface ICreateDriverPayload {
  name: string;
  phoneNumber: string;
  whatsappNumber: string;
  licensePhotoUrl?: string | null;
  licenseDetails?: string | null;
  notes?: string | null;
  availability?: DriverAvailability;
  assignedVehicleId?: string | null;
}

export type IUpdateDriverPayload = Partial<ICreateDriverPayload>;

export interface IUpdateDriverAvailabilityPayload {
  availability: DriverAvailability;
}

export interface IDriverQuery {
  searchTerm?: string;
  availability?: DriverAvailability;
  assignedVehicleId?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
