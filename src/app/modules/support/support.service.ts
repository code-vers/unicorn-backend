import prisma from '../../utils/prisma';
import { QueryBuilder } from '../../utils/QueryBuilder';
import { ISupportTicketPayload, ISupportQuery, ISupportStatusUpdatePayload } from './support.interface';
import AppError from '../../errors/AppError';
import { sendEmail } from '../../utils/email';

const createTicket = async (payload: ISupportTicketPayload, userId?: string) => {
  let name = payload.name;
  let email = payload.email;
  let phone = payload.phone;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      name = user.name;
      email = user.email;
      // You can also get phone from user profile if it exists, for now it relies on payload
    }
  }

  if (!name || !email) {
    throw new AppError(400, 'Name and email are required');
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: userId || null,
      name,
      email,
      phone,
      subject: payload.subject,
      message: payload.message,
      attachmentUrl: payload.attachmentUrl
    }
  });

  // Send confirmation email asynchronously (do not await to block response)
  sendEmail(
    email,
    'Support Ticket Received',
    `<p>Hi ${name},</p><p>We have received your support request regarding "<strong>${payload.subject}</strong>". Our team will get back to you as soon as possible.</p><p>Thank you,<br/>Unicorn Support Team</p>`
  ).catch(err => console.error('Error sending support confirmation email:', err));

  return ticket;
};

const getAllTickets = async (query: ISupportQuery) => {
  const queryBuilder = new QueryBuilder(query)
    .search(['name', 'email', 'subject'])
    .filter()
    .sort()
    .paginate();

  const builtQuery = queryBuilder.build();

  const tickets = await prisma.supportTicket.findMany(builtQuery as any);
  const total = await prisma.supportTicket.count({ where: builtQuery.where as any });
  const take = builtQuery.take || 10;
  const skip = builtQuery.skip || 0;

  return {
    meta: {
      page: skip / take + 1,
      limit: take,
      total,
      totalPages: Math.ceil(total / take)
    },
    data: tickets
  };
};

const getTicketById = async (id: string) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } }
  });

  if (!ticket) {
    throw new AppError(404, 'Support ticket not found.');
  }

  return ticket;
};

const updateTicketStatus = async (id: string, payload: ISupportStatusUpdatePayload) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });

  if (!ticket) {
    throw new AppError(404, 'Support ticket not found.');
  }

  const updatedTicket = await prisma.supportTicket.update({
    where: { id },
    data: { status: payload.status }
  });

  return updatedTicket;
};

export const SupportService = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicketStatus
};
