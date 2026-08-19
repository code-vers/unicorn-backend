import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

import app from './app';
import config from './app/config';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import { buildMyBookingsWhere } from './app/modules/booking/booking.service';

const createToken = (role: 'USER' | 'ADMIN') =>
  jwt.sign(
    {
      userId: '00000000-0000-4000-8000-000000000001',
      email: `${role.toLowerCase()}@example.com`,
      role
    },
    config.jwt.accessSecret,
    { expiresIn: '5m' }
  );

describe('App', () => {
  it('should return 200 on /health', async () => {
    const response = await supertest(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is healthy.');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should not throttle normal API browsing', async () => {
    const responses = await Promise.all(
      Array.from({ length: 110 }, () => supertest(app).get('/api/v1/unknown-route'))
    );

    expect(responses.every((response) => response.status === 404)).toBe(true);
    expect(responses.every((response) => response.headers['ratelimit-policy'] === undefined)).toBe(
      true
    );
  });

  it('should reject invalid public support requests before database access', async () => {
    const response = await supertest(app).post('/api/v1/support').send({ email: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed.');
  });

  it('should reject protected routes without a token', async () => {
    const response = await supertest(app).get('/api/v1/payments/my-payments');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authorization token is missing.');
  });

  it('should reject a user token on an admin-only route', async () => {
    const response = await supertest(app)
      .get('/api/v1/support')
      .set('Authorization', `Bearer ${createToken('USER')}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to access this resource.');
  });

  it('should validate booking checkout payloads before invoking the database or Stripe', async () => {
    const response = await supertest(app)
      .post('/api/v1/bookings/checkout')
      .set('Authorization', `Bearer ${createToken('USER')}`)
      .send({ vehicleId: 'not-a-uuid' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed.');
  });

  it('should accept authentication from the HttpOnly access-token cookie', async () => {
    const response = await supertest(app)
      .post('/api/v1/bookings/checkout')
      .set('Cookie', `accessToken=${createToken('USER')}`)
      .send({ vehicleId: 'not-a-uuid' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed.');
  });

  it('should not expose a customer pay-later checkout endpoint', async () => {
    const response = await supertest(app)
      .post('/api/v1/payments/create-checkout-session')
      .set('Authorization', `Bearer ${createToken('USER')}`)
      .send({ bookingId: '00000000-0000-4000-8000-000000000001' });

    expect(response.status).toBe(404);
  });

  it('should prevent customers from creating unpaid bookings directly', async () => {
    const response = await supertest(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${createToken('USER')}`)
      .send({});

    expect(response.status).toBe(403);
  });

  it('should omit absent optional filters from customer booking queries', () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    const where = buildMyBookingsWhere(userId);
    const filters = Array.isArray(where.AND) ? where.AND : [where.AND];

    expect(filters).not.toContain(undefined);
    expect(filters).toContainEqual({ userId });
  });

  it('should never expose unexpected server error details to API clients', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status } as unknown as Response;

    globalErrorHandler(
      new Error('Sensitive Prisma path and query details'),
      {} as Request,
      response,
      jest.fn() as NextFunction
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong.',
      errorSources: [{ path: '', message: 'Something went wrong.' }]
    });
  });

  it('should reject disallowed upload types before storing document data', async () => {
    const response = await supertest(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${createToken('USER')}`)
      .field('type', 'NATIONAL_ID')
      .attach('file', Buffer.from('<html></html>'), {
        filename: 'document.html',
        contentType: 'text/html'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid file type for this upload.');
  });

  it('should reject unsigned Stripe webhook requests', async () => {
    const response = await supertest(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Stripe signature is required.');
  });
});
