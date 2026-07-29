import type { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../utils/QueryBuilder';
import prisma from '../../utils/prisma';
import type {
  ICreateDriverPayload,
  IDriverQuery,
  IUpdateDriverAvailabilityPayload,
  IUpdateDriverPayload
} from './driver.interface';

const getDriverSelect = () => ({
  id: true,
  name: true,
  phoneNumber: true,
  whatsappNumber: true,
  photoUrl: true,
  licensePhotoUrl: true,
  licenseDetails: true,
  availability: true,
  notes: true,
  assignedVehicleId: true,
  createdAt: true,
  updatedAt: true,
  assignedVehicle: {
    select: {
      id: true,
      name: true,
      brand: true,
      category: true
    }
  },
  bookings: {
    where: {
      bookingStatus: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] },
      pickupDate: { lte: new Date() },
      dropOffDate: { gte: new Date() }
    },
    take: 1
  }
} satisfies Prisma.DriverSelect);

const createDriver = async (
  payload: ICreateDriverPayload,
  photoUrl?: string,
  licensePhotoUrl?: string
) => {
  if (payload.assignedVehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: payload.assignedVehicleId }
    });
    if (!vehicle) {
      throw new AppError(404, 'Assigned vehicle not found.');
    }
  }

  const driver = await prisma.driver.create({
    data: {
      ...payload,
      photoUrl: photoUrl || null,
      licensePhotoUrl: licensePhotoUrl || null
    },
    select: getDriverSelect()
  });

  return driver;
};

const getAllDrivers = async (query: IDriverQuery) => {
  const queryBuilder = new QueryBuilder(query)
    .search(['name', 'phoneNumber', 'whatsappNumber'])
    .filter()
    .sort()
    .paginate();

  const builtQuery = queryBuilder.build();

  // Enforce isDeleted: false
  const whereClause: Prisma.DriverWhereInput = {
    ...builtQuery.where,
    isDeleted: false
  };

  if (query.availableFromDate && query.availableToDate) {
    const pickupDateObj = new Date(query.availableFromDate);
    const dropOffDateObj = new Date(query.availableToDate);

    whereClause.bookings = {
      none: {
        bookingStatus: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] },
        pickupDate: { lte: dropOffDateObj },
        dropOffDate: { gte: pickupDateObj }
      }
    };
  }

  const drivers = await prisma.driver.findMany({
    ...builtQuery,
    where: whereClause,
    select: getDriverSelect()
  });

  const total = await prisma.driver.count({ where: whereClause });

  return {
    meta: {
      total,
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10
    },
    data: drivers
  };
};

const getDriverById = async (id: string) => {
  const driver = await prisma.driver.findFirst({
    where: { id, isDeleted: false },
    select: getDriverSelect()
  });

  if (!driver) {
    throw new AppError(404, 'Driver not found.');
  }

  return driver;
};

const deletePhotoFile = (photoPath: string) => {
  if (!photoPath) return;
  const fullPath = path.join(process.cwd(), photoPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (err) {
      console.error(`Failed to delete driver photo: ${fullPath}`, err);
    }
  }
};

const updateDriver = async (
  id: string,
  payload: IUpdateDriverPayload,
  newPhotoUrl?: string,
  newLicensePhotoUrl?: string
) => {
  const existingDriver = await prisma.driver.findFirst({
    where: { id, isDeleted: false }
  });

  if (!existingDriver) {
    throw new AppError(404, 'Driver not found.');
  }

  if (payload.assignedVehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: payload.assignedVehicleId }
    });
    if (!vehicle) {
      throw new AppError(404, 'Assigned vehicle not found.');
    }
  }

  const dataToUpdate: Prisma.DriverUpdateInput = { ...payload };

  if (newPhotoUrl) {
    dataToUpdate.photoUrl = newPhotoUrl;
    // Delete old photo if replacing
    if (existingDriver.photoUrl) {
      deletePhotoFile(existingDriver.photoUrl);
    }
  }

  if (newLicensePhotoUrl) {
    dataToUpdate.licensePhotoUrl = newLicensePhotoUrl;
    // Delete old license photo if replacing
    if (existingDriver.licensePhotoUrl) {
      deletePhotoFile(existingDriver.licensePhotoUrl);
    }
  }

  const updatedDriver = await prisma.driver.update({
    where: { id },
    data: dataToUpdate,
    select: getDriverSelect()
  });

  return updatedDriver;
};

const updateAvailability = async (id: string, payload: IUpdateDriverAvailabilityPayload) => {
  const existingDriver = await prisma.driver.findFirst({
    where: { id, isDeleted: false }
  });

  if (!existingDriver) {
    throw new AppError(404, 'Driver not found.');
  }

  const updatedDriver = await prisma.driver.update({
    where: { id },
    data: { availability: payload.availability },
    select: getDriverSelect()
  });

  return updatedDriver;
};

const deleteDriver = async (idOrIds: string | string[]) => {
  let ids: string[] = [];

  if (Array.isArray(idOrIds)) {
    ids = idOrIds;
  } else if (typeof idOrIds === 'string') {
    ids = [idOrIds];
  }

  if (ids.length === 0) {
    throw new AppError(400, 'No driver ID provided.');
  }

  const existingDrivers = await prisma.driver.findMany({
    where: { id: { in: ids }, isDeleted: false }
  });

  if (existingDrivers.length === 0) {
    throw new AppError(404, 'Driver(s) not found.');
  }

  // Soft delete driver
  await prisma.driver.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true }
  });

  // Also delete physical photo files to save space
  existingDrivers.forEach((driver) => {
    if (driver.photoUrl) deletePhotoFile(driver.photoUrl);
    if (driver.licensePhotoUrl) deletePhotoFile(driver.licensePhotoUrl);
  });
};

export const DriverService = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  updateAvailability,
  deleteDriver
};
