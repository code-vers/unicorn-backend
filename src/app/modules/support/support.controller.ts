import { RequestHandler } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { ISupportQuery } from './support.interface';

const createTicket: RequestHandler = catchAsync(async (req, res) => {
  // Extract userId if the user is authenticated (from auth middleware)
  // Our auth middleware assigns req.user with { id, role, email, etc }
  const userId = req.user?.userId;
  const result = await SupportService.createTicket(req.body, userId);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Support ticket submitted successfully.',
    data: result
  });
});

const getAllTickets: RequestHandler = catchAsync(async (req, res) => {
  const query = req.query as unknown as ISupportQuery;
  const result = await SupportService.getAllTickets(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Support tickets retrieved successfully.',
    meta: result.meta,
    data: result.data
  });
});

const getTicketById: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await SupportService.getTicketById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Support ticket retrieved successfully.',
    data: result
  });
});

const updateTicketStatus: RequestHandler = catchAsync(async (req, res) => {
  const id = req.params['id'] as string;
  const result = await SupportService.updateTicketStatus(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Support ticket status updated successfully.',
    data: result
  });
});

export const SupportController = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicketStatus
};
