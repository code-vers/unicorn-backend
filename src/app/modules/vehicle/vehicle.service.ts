import type { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';
import prisma from '../../utils/prisma';
import type {
  ICreateVehiclePayload,
  IUpdateAvailabilityPayload,
  IUpdateVehiclePayload,
  IVehicleImagePayload,
  IVehicleQuery
} from './vehicle.interface';

const VEHICLE_INCLUDE = {
  location: { select: { id: true, name: true, city: true } },
  images: { select: { id: true, path: true, order: true }, orderBy: { order: 'asc' } },
  pricing: true
} satisfies Prisma.VehicleInclude;

const createVehicle = async (
  payload: ICreateVehiclePayload,
  images: IVehicleImagePayload[]
) => {
  // Check if location exists
  const location = await prisma.location.findFirst({
    where: { id: payload.locationId, isDeleted: false }
  });

  if (!location) {
    throw new AppError(404, 'Location not found.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: payload
    });

    if (images.length > 0) {
      await tx.vehicleImage.createMany({
        data: images.map((img, idx) => ({
          vehicleId: vehicle.id,
          path: img.path,
          order: img.order ?? idx
        }))
      });
    }

    return await tx.vehicle.findUnique({
      where: { id: vehicle.id },
      include: VEHICLE_INCLUDE
    });
  });

  return result;
};

const getAllVehicles = async (query: IVehicleQuery) => {
  const queryBuilder = new QueryBuilder(query)
    .search(['name', 'brand'])
    .filter()
    .sort()
    .paginate();

  const builtQuery = queryBuilder.build();

  const whereClause: Prisma.VehicleWhereInput = { ...builtQuery.where };

  // Handle custom price range filters
  if (query.minPrice || query.maxPrice) {
    const dailyRateFilter: any = {};
    if (query.minPrice) dailyRateFilter.gte = Number(query.minPrice);
    if (query.maxPrice) dailyRateFilter.lte = Number(query.maxPrice);
    whereClause.pricing = { is: { dailyRate: dailyRateFilter } };
  }

  const vehicles = await prisma.vehicle.findMany({
    ...builtQuery,
    where: whereClause,
    include: VEHICLE_INCLUDE
  });

  const globalPricing = await prisma.pricing.findFirst({ where: { vehicleId: null } });

  const vehiclesWithPricing = vehicles.map(v => ({
    ...v,
    pricing: v.pricing || globalPricing
  }));

  const total = await prisma.vehicle.count({ where: whereClause });

  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    },
    data: vehiclesWithPricing
  };
};

const getVehicleById = async (id: string) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: VEHICLE_INCLUDE
  });

  if (!vehicle) {
    throw new AppError(404, 'Vehicle not found.');
  }

  if (!vehicle.pricing) {
    const globalPricing = await prisma.pricing.findFirst({ where: { vehicleId: null } });
    (vehicle as any).pricing = globalPricing;
  }

  return vehicle;
};

const deleteImageFiles = (imagePaths: string[]) => {
  imagePaths.forEach((imgPath) => {
    const fullPath = path.join(process.cwd(), imgPath);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (err) {
        console.error(`Failed to delete file: ${fullPath}`, err);
      }
    }
  });
};

const updateVehicle = async (
  id: string,
  payload: IUpdateVehiclePayload,
  newImages?: IVehicleImagePayload[]
) => {
  const existingVehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { images: true }
  });

  if (!existingVehicle) {
    throw new AppError(404, 'Vehicle not found.');
  }

  if (payload.locationId) {
    const location = await prisma.location.findFirst({
      where: { id: payload.locationId, isDeleted: false }
    });
    if (!location) throw new AppError(404, 'Location not found.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // If new images are provided, replace old ones completely
    if (newImages && newImages.length > 0) {
      // 1. Delete old images from DB
      await tx.vehicleImage.deleteMany({
        where: { vehicleId: id }
      });
      
      // 2. Insert new images
      await tx.vehicleImage.createMany({
        data: newImages.map((img, idx) => ({
          vehicleId: id,
          path: img.path,
          order: img.order ?? idx
        }))
      });

      // 3. Delete old physical files
      const oldImagePaths = existingVehicle.images.map(img => img.path);
      deleteImageFiles(oldImagePaths);
    }

    const updatedVehicle = await tx.vehicle.update({
      where: { id },
      data: payload,
      include: VEHICLE_INCLUDE
    });

    if (!updatedVehicle.pricing) {
      const globalPricing = await tx.pricing.findFirst({ where: { vehicleId: null } });
      (updatedVehicle as any).pricing = globalPricing;
    }

    return updatedVehicle;
  });

  return result;
};

const updateAvailability = async (id: string, payload: IUpdateAvailabilityPayload) => {
  const existingVehicle = await prisma.vehicle.findUnique({ where: { id } });

  if (!existingVehicle) {
    throw new AppError(404, 'Vehicle not found.');
  }

  const updatedVehicle = await prisma.vehicle.update({
    where: { id },
    data: { availability: payload.availability },
    include: VEHICLE_INCLUDE
  });

  return updatedVehicle;
};

const deleteVehicle = async (idOrIds: string | string[]) => {
  let ids: string[] = [];
  
  if (Array.isArray(idOrIds)) {
    ids = idOrIds;
  } else if (typeof idOrIds === 'string') {
    ids = [idOrIds];
  }

  if (ids.length === 0) {
    throw new AppError(400, 'No vehicle ID provided.');
  }

  const existingVehicles = await prisma.vehicle.findMany({
    where: { id: { in: ids } },
    include: { images: true }
  });

  if (existingVehicles.length === 0) {
    throw new AppError(404, 'Vehicle(s) not found.');
  }

  // DB deletion (Cascade handles vehicle_images rows)
  await prisma.vehicle.deleteMany({
    where: { id: { in: ids } }
  });

  // Filesystem deletion
  const imagePaths = existingVehicles.flatMap(v => v.images.map(img => img.path));
  deleteImageFiles(imagePaths);
};

export const VehicleService = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  updateAvailability,
  deleteVehicle
};
