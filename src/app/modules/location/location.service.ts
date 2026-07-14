import type { Location, LocationStatus, LocationType, Prisma } from '@prisma/client';

import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';
import prisma from '../../utils/prisma';
import type {
  ICreateLocationPayload,
  ILocationQuery,
  ILocationResponse,
  IUpdateLocationPayload
} from './location.interface';

type LocationSelectedFields = {
  id: string;
  name: string;
  address: string;
  city: string;
  locationType: LocationType;
  status: LocationStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const LOCATION_SELECT = {
  id: true,
  name: true,
  address: true,
  city: true,
  locationType: true,
  status: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.LocationSelect;

const sanitizeLocation = (location: LocationSelectedFields): ILocationResponse => ({
  id: location.id,
  name: location.name,
  address: location.address,
  city: location.city,
  locationType: location.locationType,
  status: location.status,
  createdAt: location.createdAt,
  updatedAt: location.updatedAt
});

const createLocation = async (payload: ICreateLocationPayload): Promise<ILocationResponse> => {
  const existingLocation = await prisma.location.findFirst({
    where: {
      name: { equals: payload.name, mode: 'insensitive' },
      city: { equals: payload.city, mode: 'insensitive' },
      isDeleted: false
    }
  });

  if (existingLocation) {
    throw new AppError(409, `A location named "${payload.name}" already exists in ${payload.city}.`);
  }

  const location = await prisma.location.create({
    data: {
      name: payload.name,
      address: payload.address,
      city: payload.city,
      locationType: payload.locationType,
      status: payload.status ?? 'ACTIVE'
    }
  });

  return sanitizeLocation(location);
};

const getAllLocations = async (
  query: ILocationQuery
): Promise<{ meta: { total: number; page: number; limit: number }; data: ILocationResponse[] }> => {
  const queryBuilder = new QueryBuilder(query)
    .search(['name', 'address', 'city'])
    .filter()
    .sort()
    .paginate();

  const builtQuery = queryBuilder.build();

  // Always exclude soft-deleted records
  const whereClause: Prisma.LocationWhereInput = {
    ...builtQuery.where,
    isDeleted: false
  };

  const locations = await prisma.location.findMany({
    ...builtQuery,
    where: whereClause,
    select: LOCATION_SELECT
  });

  const total = await prisma.location.count({ where: whereClause });

  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    },
    data: locations.map(sanitizeLocation)
  };
};

const getLocationById = async (id: string): Promise<ILocationResponse> => {
  const location = await prisma.location.findFirst({
    where: { id, isDeleted: false }
  });

  if (!location) {
    throw new AppError(404, 'Location not found.');
  }

  return sanitizeLocation(location);
};

const updateLocation = async (
  id: string,
  payload: IUpdateLocationPayload
): Promise<ILocationResponse> => {
  const existingLocation = await prisma.location.findFirst({
    where: { id, isDeleted: false }
  });

  if (!existingLocation) {
    throw new AppError(404, 'Location not found.');
  }

  // Check for duplicate name+city (excluding current record)
  if (payload.name || payload.city) {
    const nameToCheck = payload.name ?? existingLocation.name;
    const cityToCheck = payload.city ?? existingLocation.city;

    const duplicate = await prisma.location.findFirst({
      where: {
        name: { equals: nameToCheck, mode: 'insensitive' },
        city: { equals: cityToCheck, mode: 'insensitive' },
        isDeleted: false,
        NOT: { id }
      }
    });

    if (duplicate) {
      throw new AppError(
        409,
        `A location named "${nameToCheck}" already exists in ${cityToCheck}.`
      );
    }
  }

  const updatedLocation = await prisma.location.update({
    where: { id },
    data: payload
  });

  return sanitizeLocation(updatedLocation);
};

const deleteLocation = async (id: string): Promise<void> => {
  const existingLocation = await prisma.location.findFirst({
    where: { id, isDeleted: false }
  });

  if (!existingLocation) {
    throw new AppError(404, 'Location not found.');
  }

  await prisma.location.update({
    where: { id },
    data: { isDeleted: true }
  });
};

export const LocationService = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation
};
