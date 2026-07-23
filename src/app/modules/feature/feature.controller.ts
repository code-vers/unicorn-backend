import { RequestHandler } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FeatureService } from './feature.service';
import { IFeatureQuery } from './feature.interface';

const createFeature: RequestHandler = catchAsync(async (req, res) => {
  const result = await FeatureService.createFeature(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Feature created successfully.',
    data: result
  });
});

const getAllFeatures: RequestHandler = catchAsync(async (req, res) => {
  const query = req.query as unknown as IFeatureQuery;
  const result = await FeatureService.getAllFeatures(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Features retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const getFeatureById: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await FeatureService.getFeatureById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Feature retrieved successfully.',
    data: result
  });
});

const updateFeature: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await FeatureService.updateFeature(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Feature updated successfully.',
    data: result
  });
});

const deleteFeature: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await FeatureService.deleteFeature(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Feature deleted successfully.',
    data: result
  });
});

export const FeatureController = {
  createFeature,
  getAllFeatures,
  getFeatureById,
  updateFeature,
  deleteFeature
};
