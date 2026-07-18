import type { Request, Response } from 'express';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SettingService } from './setting.service';

const getAllSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.getAllSettings();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'System settings retrieved successfully',
    data: result
  });
});

const getSettingByKey = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  const result = await SettingService.getSettingByKey(key as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Setting retrieved successfully',
    data: result
  });
});

const upsertSetting = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingService.upsertSetting(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Setting updated successfully',
    data: result
  });
});

const deleteSetting = catchAsync(async (req: Request, res: Response) => {
  const { key } = req.params;
  await SettingService.deleteSetting(key as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Setting deleted successfully',
    data: null
  });
});

export const SettingController = {
  getAllSettings,
  getSettingByKey,
  upsertSetting,
  deleteSetting
};
