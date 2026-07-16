import type { RequestHandler } from 'express';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { IDropOffChargeQuery } from './dropOffCharge.interface';
import { DropOffChargeService } from './dropOffCharge.service';

const createCharge: RequestHandler = catchAsync(async (req, res) => {
  const result = await DropOffChargeService.createCharge(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Drop-off charge created successfully.',
    data: result
  });
});

const getAllCharges: RequestHandler = catchAsync(async (req, res) => {
  const query = req.query as unknown as IDropOffChargeQuery;
  const result = await DropOffChargeService.getAllCharges(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drop-off charges retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const getChargeById: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await DropOffChargeService.getChargeById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drop-off charge retrieved successfully.',
    data: result
  });
});

const updateCharge: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await DropOffChargeService.updateCharge(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drop-off charge updated successfully.',
    data: result
  });
});

const deleteCharge: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  await DropOffChargeService.deleteCharge(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Drop-off charge deleted successfully.',
    data: null
  });
});

export const DropOffChargeController = {
  createCharge,
  getAllCharges,
  getChargeById,
  updateCharge,
  deleteCharge
};
