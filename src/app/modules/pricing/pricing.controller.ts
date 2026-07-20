import type { RequestHandler } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PricingService } from './pricing.service';

const savePricing: RequestHandler = catchAsync(async (req, res) => {
  const result = await PricingService.savePricing(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Pricing configuration saved successfully.',
    data: result
  });
});

const getPricing: RequestHandler = catchAsync(async (req, res) => {
  const vehicleId = req.query['vehicleId'] as string | undefined;
  const result = await PricingService.getPricing(vehicleId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Pricing configuration retrieved successfully.',
    data: result
  });
});

const deletePricing: RequestHandler = catchAsync(async (req, res) => {
  const vehicleId = req.params['vehicleId'] as string;
  await PricingService.deletePricing(vehicleId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Pricing configuration deleted successfully. Fallback to global pricing enabled.',
    data: null
  });
});

export const PricingController = {
  savePricing,
  getPricing,
  deletePricing
};
