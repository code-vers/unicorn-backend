import type { RequestHandler } from 'express';

import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { IVehicleImagePayload, IVehicleQuery } from './vehicle.interface';
import { VehicleService } from './vehicle.service';

const createVehicle: RequestHandler = catchAsync(async (req, res) => {
  // Extract images from req.files
  const images: IVehicleImagePayload[] = [];
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach((file, index) => {
      const fileName = file.filename || file.originalname;
      images.push({
        path: `/uploads/vehicles/${fileName}`,
        order: index
      });
    });
  }

  const result = await VehicleService.createVehicle(req.body, images);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Vehicle created successfully.',
    data: result
  });
});

const getAllVehicles: RequestHandler = catchAsync(async (req, res) => {
  const query = req.query as unknown as IVehicleQuery;
  
  // Hide INACTIVE vehicles from regular users
  if (req.user && req.user.role === 'USER') {
    query.status = 'ACTIVE';
  }

  const result = await VehicleService.getAllVehicles(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Vehicles retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const getVehicleById: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await VehicleService.getVehicleById(id);

  if (req.user && req.user.role === 'USER' && result.status === 'INACTIVE') {
    throw new AppError(404, 'Vehicle not found.');
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Vehicle retrieved successfully.',
    data: result
  });
});

const updateVehicle: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;

  // Extract images if any are uploaded
  let newImages: IVehicleImagePayload[] | undefined = undefined;
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    newImages = [];
    req.files.forEach((file, index) => {
      const fileName = file.filename || file.originalname;
      newImages!.push({
        path: `/uploads/vehicles/${fileName}`,
        order: index
      });
    });
  }

  const result = await VehicleService.updateVehicle(id, req.body, newImages);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Vehicle updated successfully.',
    data: result
  });
});

const updateAvailability: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await VehicleService.updateAvailability(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Vehicle availability updated successfully.',
    data: result
  });
});

const deleteVehicle: RequestHandler = catchAsync(async (req, res) => {
  const idOrIds = Array.isArray(req.body) && req.body.length > 0 ? req.body : req.params['id'] as string;
  await VehicleService.deleteVehicle(idOrIds);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Vehicle deleted successfully.',
    data: null
  });
});

export const VehicleController = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  updateAvailability,
  deleteVehicle
};
