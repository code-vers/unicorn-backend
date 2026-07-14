import type { LocationStatus, LocationType } from '@prisma/client';

export type { LocationStatus, LocationType };

export interface ICreateLocationPayload {
  name: string;
  address: string;
  city: string;
  locationType: LocationType;
  status?: LocationStatus;
}

export type IUpdateLocationPayload = Partial<ICreateLocationPayload>;

export interface ILocationResponse {
  id: string;
  name: string;
  address: string;
  city: string;
  locationType: LocationType;
  status: LocationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILocationQuery {
  searchTerm?: string;
  city?: string;
  locationType?: LocationType;
  status?: LocationStatus;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
