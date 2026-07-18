import type { Request, Response } from 'express';

import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { BookingService } from './booking.service';

const calculate = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingService.calculate(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Booking costs calculated successfully',
    data: result
  });
});

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await BookingService.createBooking(userId, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Booking created successfully',
    data: result
  });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await BookingService.getMyBookings(userId, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Bookings retrieved successfully',
    meta: result.meta,
    data: result.data
  });
});

const getBookingById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BookingService.getBookingById(id as string, req.user!.userId, req.user!.role);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Booking retrieved successfully',
    data: result
  });
});

const addPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BookingService.addPayment(id as string, req.body, 'INITIAL');

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment added successfully',
    data: result
  });
});

const extendPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BookingService.addPayment(id as string, req.body, 'EXTENSION');

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Extension payment added successfully',
    data: result
  });
});

const modifyBooking = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const result = await BookingService.modifyBooking(id as string, userId, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Booking modified successfully',
    data: result
  });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const result = await BookingService.getAllBookings(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All bookings retrieved successfully',
    meta: result.meta,
    data: result.data
  });
});

const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BookingService.updateBookingStatus(id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Booking status updated successfully',
    data: result
  });
});

export const BookingController = {
  calculate,
  createBooking,
  getMyBookings,
  getBookingById,
  addPayment,
  extendPayment,
  modifyBooking,
  getAllBookings,
  updateBookingStatus
};
