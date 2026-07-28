import { RequestHandler } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ActivityService } from './activity.service';

const getRecentActivity: RequestHandler = catchAsync(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
  const result = await ActivityService.getRecentActivity(limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Recent activity retrieved successfully.',
    data: result
  });
});

export const ActivityController = {
  getRecentActivity,
};
