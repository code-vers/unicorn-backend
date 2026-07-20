import type { RequestHandler } from 'express';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { IDriverQuery } from './driver.interface';
import { DriverService } from './driver.service';

const createDriver: RequestHandler = catchAsync(async (req, res) => {
  let photoUrl: string | undefined = undefined;
  let licensePhotoUrl: string | undefined = undefined;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (files?.photo?.[0]) {
    const fileName = files.photo[0].filename || files.photo[0].originalname;
    photoUrl = `/uploads/drivers/${fileName}`;
  }
  if (files?.licensePhoto?.[0]) {
    const fileName = files.licensePhoto[0].filename || files.licensePhoto[0].originalname;
    licensePhotoUrl = `/uploads/drivers/${fileName}`;
  }

  const result = await DriverService.createDriver(req.body, photoUrl, licensePhotoUrl);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Driver created successfully.',
    data: result
  });
});

const getAllDrivers: RequestHandler = catchAsync(async (req, res) => {
  const query = req.query as unknown as IDriverQuery;
  const result = await DriverService.getAllDrivers(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drivers retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const getDriverById: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await DriverService.getDriverById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Driver retrieved successfully.',
    data: result
  });
});

const updateDriver: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  let newPhotoUrl: string | undefined = undefined;
  let newLicensePhotoUrl: string | undefined = undefined;

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  if (files?.photo?.[0]) {
    const fileName = files.photo[0].filename || files.photo[0].originalname;
    newPhotoUrl = `/uploads/drivers/${fileName}`;
  }
  if (files?.licensePhoto?.[0]) {
    const fileName = files.licensePhoto[0].filename || files.licensePhoto[0].originalname;
    newLicensePhotoUrl = `/uploads/drivers/${fileName}`;
  }

  const result = await DriverService.updateDriver(id, req.body, newPhotoUrl, newLicensePhotoUrl);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Driver updated successfully.',
    data: result
  });
});

const updateAvailability: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await DriverService.updateAvailability(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Driver availability updated successfully.',
    data: result
  });
});

const deleteDriver: RequestHandler = catchAsync(async (req, res) => {
  const idOrIds = Array.isArray(req.body) && req.body.length > 0 ? req.body : req.params['id'] as string;
  await DriverService.deleteDriver(idOrIds);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Driver deleted successfully.',
    data: null
  });
});

export const DriverController = {
  createDriver,
  getAllDrivers,
  getDriverById,
  updateDriver,
  updateAvailability,
  deleteDriver
};
