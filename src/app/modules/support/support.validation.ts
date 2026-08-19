import { z } from 'zod';

const createTicket = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(120),
      email: z
        .string()
        .trim()
        .email()
        .transform((value) => value.toLowerCase()),
      phone: z.string().trim().min(7).max(30).optional(),
      subject: z.string().trim().min(3).max(200),
      message: z.string().trim().min(10).max(5000)
    })
    .strict()
});

const updateStatus = z.object({
  body: z.object({ status: z.enum(['PENDING', 'RESOLVED', 'CLOSED']) }).strict()
});

export const SupportValidation = { createTicket, updateStatus };
