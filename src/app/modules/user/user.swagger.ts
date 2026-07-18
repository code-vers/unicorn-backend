import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { UserValidation } from './user.validation';
import { createErrorResponse, createPaginatedResponse, createSuccessResponse, Error400, Error401, Error403, Error404, Error500 } from '../../utils/swaggerHelpers';

export const registerUserSwagger = (registry: OpenAPIRegistry, bearerAuth: any) => {
  const UserDocumentSchema = z.object({
    id: z.string().openapi({ example: 'doc-1234' }),
    type: z.string().openapi({ example: 'DRIVERS_LICENSE' }),
    name: z.string().openapi({ example: 'My License' }).nullable(),
    path: z.string().openapi({ example: '/uploads/documents/license.pdf' }),
    status: z.string().openapi({ example: 'PENDING_REVIEW' }),
    createdAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' })
  });

  const UserProfileSchema = z.object({
    id: z.string().openapi({ example: 'uuid-1234' }),
    name: z.string().openapi({ example: 'John Doe' }),
    email: z.string().openapi({ example: 'john@example.com' }),
    role: z.string().openapi({ example: 'USER' }),
    status: z.string().openapi({ example: 'ACTIVE' }),
    photoUrl: z.string().openapi({ example: '/uploads/profiles/photo.jpg' }).nullable(),
    phoneNumber: z.string().openapi({ example: '+1234567890' }).nullable(),
    address: z.string().openapi({ example: '123 Main St' }).nullable(),
    idPassportNumber: z.string().openapi({ example: 'AB1234567' }).nullable(),
    emergencyContactName: z.string().openapi({ example: 'Jane Doe' }).nullable(),
    emergencyContactEmail: z.string().openapi({ example: 'jane@example.com' }).nullable(),
    emergencyContactPhone: z.string().openapi({ example: '+1987654321' }).nullable(),
    emergencyContactRelation: z.string().openapi({ example: 'Spouse' }).nullable(),
    createdAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
    updatedAt: z.string().openapi({ example: '2023-01-01T00:00:00.000Z' }),
    documents: z.array(UserDocumentSchema).optional()
  });

  // Get Me
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/me',
    tags: ['Users (Customer)'],
    summary: 'Get current user profile',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
      200: createSuccessResponse(UserProfileSchema, 'User profile retrieved successfully', 'User profile retrieved successfully.'),
      401: Error401,
      404: Error404,
      500: Error500
    }
  });

  // Update Profile
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/profile',
    tags: ['Users (Customer)'],
    summary: 'Update user profile',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              name: z.string().optional(),
              phoneNumber: z.string().optional(),
              address: z.string().optional(),
              idPassportNumber: z.string().optional(),
              emergencyContactName: z.string().optional(),
              emergencyContactEmail: z.string().optional(),
              emergencyContactPhone: z.string().optional(),
              emergencyContactRelation: z.string().optional(),
              photo: z.any().openapi({ type: 'string', format: 'binary', description: 'Profile Photo' }).optional()
            })
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(UserProfileSchema, 'Profile updated successfully', 'Profile updated successfully.'),
      400: Error400,
      401: Error401,
      500: Error500
    }
  });

  // Change Password
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/password',
    tags: ['Users (Customer)'],
    summary: 'Change password',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: (UserValidation.changePassword as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Password changed successfully', 'Password changed successfully.'),
      400: Error400,
      401: Error401,
      500: Error500
    }
  });

  // Upload Document
  registry.registerPath({
    method: 'post',
    path: '/api/v1/users/documents',
    tags: ['Users (Customer)'],
    summary: 'Upload user document',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: z.object({
              type: z.enum(['DRIVERS_LICENSE', 'PASSPORT_ID', 'KRA_PIN', 'INSURANCE', 'OTHER']),
              name: z.string().optional(),
              document: z.any().openapi({ type: 'string', format: 'binary', description: 'Document File (PDF or Image)' })
            })
          }
        }
      }
    },
    responses: {
      201: createSuccessResponse(UserDocumentSchema, 'Document uploaded successfully', 'Document uploaded successfully.'),
      400: Error400,
      401: Error401,
      500: Error500
    }
  });

  // Delete Document
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/documents/{docId}',
    tags: ['Users (Customer)'],
    summary: 'Delete user document',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        docId: z.string().openapi({ description: 'Document ID' })
      })
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Document deleted successfully', 'Document deleted successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // Get All Users (Admin)
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users',
    tags: ['Users (Admin)'],
    summary: 'Get all users',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      query: z.object({
        searchTerm: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.string().optional(),
        status: z.enum(['ACTIVE', 'BLOCKED', 'INACTIVE']).optional(),
        role: z.enum(['USER', 'ADMIN']).optional()
      })
    },
    responses: {
      200: createPaginatedResponse(UserProfileSchema, 'Users retrieved successfully', 'Users retrieved successfully.'),
      401: Error401,
      403: Error403,
      500: Error500
    }
  });

  // Get User By ID (Admin)
  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/{id}',
    tags: ['Users (Admin)'],
    summary: 'Get user by ID',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'User ID' })
      })
    },
    responses: {
      200: createSuccessResponse(UserProfileSchema, 'User retrieved successfully', 'User retrieved successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // Admin Update User
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}',
    tags: ['Users (Admin)'],
    summary: 'Update user status or notes (Admin)',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'User ID' })
      }),
      body: {
        content: {
          'application/json': {
            schema: (UserValidation.adminUpdateUser as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(UserProfileSchema, 'User updated successfully', 'User updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // Update Document Status (Admin)
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/documents/{docId}/status',
    tags: ['Users (Admin)'],
    summary: 'Update document verification status',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        docId: z.string().openapi({ description: 'Document ID' })
      }),
      body: {
        content: {
          'application/json': {
            schema: (UserValidation.updateDocumentStatus as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(UserDocumentSchema, 'Document status updated successfully', 'Document status updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // Change Role (Admin)
  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}/role',
    tags: ['Users (Admin)'],
    summary: 'Change user role',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'User ID' })
      }),
      body: {
        content: {
          'application/json': {
            schema: (UserValidation.changeRole as any).shape.body
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(UserProfileSchema, 'User role updated successfully', 'User role updated successfully.'),
      400: Error400,
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // Delete User (Admin)
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/{id}',
    tags: ['Users (Admin)'],
    summary: 'Soft delete a user',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      params: z.object({
        id: z.string().openapi({ description: 'User ID' })
      })
    },
    responses: {
      200: createSuccessResponse(z.null(), 'User deleted successfully', 'User deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });

  // Bulk Delete Users (Admin)
  registry.registerPath({
    method: 'delete',
    path: '/api/v1/users',
    tags: ['Users (Admin)'],
    summary: 'Soft delete multiple users',
    security: [{ [bearerAuth.name]: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.array(z.string()).openapi({ example: ['uuid-1', 'uuid-2'] })
          }
        }
      }
    },
    responses: {
      200: createSuccessResponse(z.null(), 'Users deleted successfully', 'Users deleted successfully.'),
      401: Error401,
      403: Error403,
      404: Error404,
      500: Error500
    }
  });
};
