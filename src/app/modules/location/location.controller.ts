import type { RequestHandler } from 'express';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { ILocationQuery } from './location.interface';
import { LocationService } from './location.service';

const createLocation: RequestHandler = catchAsync(async (req, res) => {
  const result = await LocationService.createLocation(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Location created successfully.',
    data: result
  });
});

const getAllLocations: RequestHandler = catchAsync(async (req, res) => {
  const query = req.query as ILocationQuery;
  const result = await LocationService.getAllLocations(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Locations retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const getLocationById: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await LocationService.getLocationById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Location retrieved successfully.',
    data: result
  });
});

const updateLocation: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await LocationService.updateLocation(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Location updated successfully.',
    data: result
  });
});

const deleteLocation: RequestHandler = catchAsync(async (req, res) => {
  const idOrIds = Array.isArray(req.body) && req.body.length > 0 ? req.body : req.params['id'] as string;
  await LocationService.deleteLocation(idOrIds);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Location deleted successfully.',
    data: null
  });
});

export const LocationController = {
  createLocation,
  getAllLocations,
  getLocationById,
  updateLocation,
  deleteLocation
};
