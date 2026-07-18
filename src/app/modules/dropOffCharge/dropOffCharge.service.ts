import type { Prisma } from '@prisma/client';

import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';
import prisma from '../../utils/prisma';
import type { ICreateDropOffChargePayload, IDropOffChargeQuery, IUpdateDropOffChargePayload } from './dropOffCharge.interface';

const DROPOFF_CHARGE_SELECT = {
  id: true,
  pickupLocationId: true,
  dropOffLocationId: true,
  vehicleCategory: true,
  vehicleId: true,
  chargeType: true,
  amount: true,
  seasonalMultiplier: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  pickupLocation: {
    select: {
      id: true,
      name: true,
      city: true
    }
  },
  dropOffLocation: {
    select: {
      id: true,
      name: true,
      city: true
    }
  },
  vehicle: {
    select: {
      id: true,
      name: true,
      brand: true
    }
  }
} satisfies Prisma.DropOffChargeSelect;

const createCharge = async (payload: ICreateDropOffChargePayload) => {
  // Validate locations exist
  const pickup = await prisma.location.findUnique({ where: { id: payload.pickupLocationId } });
  if (!pickup) throw new AppError(404, 'Pickup location not found.');

  const dropOff = await prisma.location.findUnique({ where: { id: payload.dropOffLocationId } });
  if (!dropOff) throw new AppError(404, 'Drop-off location not found.');

  if (payload.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: payload.vehicleId } });
    if (!vehicle) throw new AppError(404, 'Vehicle not found.');
  }

  // Check for duplicate charge rule
  const existingCharge = await prisma.dropOffCharge.findFirst({
    where: {
      pickupLocationId: payload.pickupLocationId,
      dropOffLocationId: payload.dropOffLocationId,
      vehicleCategory: payload.vehicleCategory || null,
      vehicleId: payload.vehicleId || null,
      isDeleted: false
    }
  });

  if (existingCharge) {
    throw new AppError(409, 'A drop-off charge rule already exists for this exact location and vehicle configuration.');
  }

  const result = await prisma.dropOffCharge.create({
    data: payload,
    select: DROPOFF_CHARGE_SELECT
  });

  return result;
};

const getAllCharges = async (query: IDropOffChargeQuery) => {
  const queryBuilder = new QueryBuilder(query)
    // We can't search location names easily via QueryBuilder standard search without joins, 
    // but we can filter by IDs exactly
    .filter()
    .sort()
    .paginate();

  const builtQuery = queryBuilder.build();

  const whereClause: Prisma.DropOffChargeWhereInput = {
    ...builtQuery.where,
    isDeleted: false
  };

  const charges = await prisma.dropOffCharge.findMany({
    ...builtQuery,
    where: whereClause,
    select: DROPOFF_CHARGE_SELECT
  });

  const total = await prisma.dropOffCharge.count({ where: whereClause });

  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    },
    data: charges
  };
};

const getChargeById = async (id: string) => {
  const charge = await prisma.dropOffCharge.findFirst({
    where: { id, isDeleted: false },
    select: DROPOFF_CHARGE_SELECT
  });

  if (!charge) {
    throw new AppError(404, 'Drop-off charge not found.');
  }

  return charge;
};

const updateCharge = async (id: string, payload: IUpdateDropOffChargePayload) => {
  const existingCharge = await prisma.dropOffCharge.findFirst({
    where: { id, isDeleted: false }
  });

  if (!existingCharge) {
    throw new AppError(404, 'Drop-off charge not found.');
  }

  // If locations or vehicle changed, check validity and duplicates
  if (payload.pickupLocationId || payload.dropOffLocationId || payload.vehicleId !== undefined || payload.vehicleCategory !== undefined) {
    const checkPickupId = payload.pickupLocationId || existingCharge.pickupLocationId;
    const checkDropOffId = payload.dropOffLocationId || existingCharge.dropOffLocationId;
    const checkVehicleId = payload.vehicleId !== undefined ? payload.vehicleId : existingCharge.vehicleId;
    const checkCategory = payload.vehicleCategory !== undefined ? payload.vehicleCategory : existingCharge.vehicleCategory;

    if (checkPickupId === checkDropOffId) {
      throw new AppError(400, 'Pickup and drop-off locations cannot be the same.');
    }

    const duplicateCheck = await prisma.dropOffCharge.findFirst({
      where: {
        id: { not: id },
        pickupLocationId: checkPickupId,
        dropOffLocationId: checkDropOffId,
        vehicleCategory: checkCategory || null,
        vehicleId: checkVehicleId || null,
        isDeleted: false
      }
    });

    if (duplicateCheck) {
      throw new AppError(409, 'A drop-off charge rule already exists for this configuration.');
    }
  }

  const result = await prisma.dropOffCharge.update({
    where: { id },
    data: payload,
    select: DROPOFF_CHARGE_SELECT
  });

  return result;
};

const deleteCharge = async (idOrIds: string | string[]) => {
  let ids: string[] = [];

  if (Array.isArray(idOrIds)) {
    ids = idOrIds;
  } else if (typeof idOrIds === 'string') {
    ids = [idOrIds];
  }

  if (ids.length === 0) {
    throw new AppError(400, 'No drop-off charge ID provided.');
  }

  const existingCharges = await prisma.dropOffCharge.findMany({
    where: { id: { in: ids }, isDeleted: false }
  });

  if (existingCharges.length === 0) {
    throw new AppError(404, 'Drop-off charge(s) not found.');
  }

  await prisma.dropOffCharge.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true }
  });
};

export const DropOffChargeService = {
  createCharge,
  getAllCharges,
  getChargeById,
  updateCharge,
  deleteCharge
};
