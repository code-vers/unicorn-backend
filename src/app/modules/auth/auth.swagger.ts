import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { AuthValidation } from './auth.validation';
import { createErrorResponse, createSuccessResponse, Error400, Error401, Error403, Error409, Error500 } from '../../utils/swaggerHelpers';

export const registerAuthSwagger = (registry: OpenAPIRegistry, bearerAuth: any) => {
  const UserResponseSchema = z.object({
    id: z.string().openapi({ example: 'uuid-1234' }),
    name: z.string().openapi({ example: 'John Doe' }),
    email: z.string().openapi({ example: 'john@example.com' }),
    role: z.string().openapi({ example: 'USER' })
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['Auth'],
    summary: 'Register a new user',
    request: {
      body: {
        content: {
          'application/json': {
            schema: (AuthValidation.register as any).shape.body
          }
        }
      }
    },
    responses: {
      201: createSuccessResponse(UserResponseSchema, 'User registered successfully', 'User registered successfully.'),
      400: Error400,
      409: Error409,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['Auth'],
    summary: 'Login user',
    request: {
      body: {
        content: {
          'application/json': {
            schema: (AuthValidation.login as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(
        z.object({
          accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
          user: UserResponseSchema
        }),
        'User logged in successfully',
        'User logged in successfully.'
      ),
      400: Error400,
      401: createErrorResponse('Unauthorized', 'Invalid email or password.'),
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/refresh-token',
    tags: ['Auth'],
    summary: 'Refresh access token',
    description: 'Requires a valid refreshToken in cookies.',
    responses: {
      200: createSuccessResponse(
        z.object({
          accessToken: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
        }),
        'Access token generated successfully',
        'Access token generated successfully.'
      ),
      401: createErrorResponse('Unauthorized', 'Invalid or expired refresh token.'),
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/logout',
    tags: ['Auth'],
    summary: 'Logout user',
    responses: {
      200: createSuccessResponse(null, 'Logged out successfully', 'Logged out successfully.'),
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/change-password',
    tags: ['Auth'],
    summary: 'Change password',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: (AuthValidation.changePassword as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(null, 'Password changed successfully', 'Password changed successfully.'),
      400: Error400,
      401: Error401,
      403: createErrorResponse('Forbidden', 'Old password does not match.'),
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/forgot-password',
    tags: ['Auth'],
    summary: 'Request password reset code',
    request: {
      body: {
        content: {
          'application/json': {
            schema: (AuthValidation.forgotPassword as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(null, 'Code sent successfully', 'If the email exists, a password reset code has been sent.'),
      400: Error400,
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/verify-reset-code',
    tags: ['Auth'],
    summary: 'Verify password reset code',
    request: {
      body: {
        content: {
          'application/json': {
            schema: (AuthValidation.verifyResetCode as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(
        z.object({
          resetToken: z.string().openapi({ example: 'temp-reset-jwt-token' })
        }),
        'Code verified successfully',
        'Code verified successfully. You can now reset your password.'
      ),
      400: createErrorResponse('Bad Request', 'Invalid or expired reset code.'),
      500: Error500
    }
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/reset-password',
    tags: ['Auth'],
    summary: 'Reset password using token',
    request: {
      body: {
        content: {
          'application/json': {
            schema: (AuthValidation.resetPassword as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(null, 'Password reset successfully', 'Password has been reset successfully.'),
      400: createErrorResponse('Bad Request', 'Invalid or expired reset token.'),
      500: Error500
    }
  });
};
