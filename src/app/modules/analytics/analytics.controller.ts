import { RequestHandler } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsService } from './analytics.service';

const getOverview: RequestHandler = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getOverview();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Analytics overview retrieved successfully.',
    data: result
  });
});

const getRevenueTrends: RequestHandler = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getRevenueTrends();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Revenue trends retrieved successfully.',
    data: result
  });
});

const getBookingTrends: RequestHandler = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getBookingTrends();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Booking trends retrieved successfully.',
    data: result
  });
});

const getVehicleStats: RequestHandler = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getVehicleStats();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Vehicle stats retrieved successfully.',
    data: result
  });
});

const getPerformance: RequestHandler = catchAsync(async (req, res) => {
  const result = await AnalyticsService.getPerformance();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Performance stats retrieved successfully.',
    data: result
  });
});

export const AnalyticsController = {
  getOverview,
  getRevenueTrends,
  getBookingTrends,
  getVehicleStats,
  getPerformance,
};
