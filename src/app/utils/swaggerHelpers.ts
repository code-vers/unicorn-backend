import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const createSuccessResponse = (
  schema: z.ZodTypeAny | null,
  description: string,
  message: string
) => {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          success: z.boolean().openapi({ example: true }),
          message: z.string().openapi({ example: message }),
          data: schema ? schema : z.null().openapi({ example: null })
        })
      }
    }
  };
};

export const createPaginatedResponse = (
  schema: z.ZodTypeAny,
  description: string,
  message: string
) => {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          success: z.boolean().openapi({ example: true }),
          message: z.string().openapi({ example: message }),
          meta: z.object({
            page: z.number().openapi({ example: 1 }),
            limit: z.number().openapi({ example: 10 }),
            total: z.number().openapi({ example: 100 })
          }),
          data: z.array(schema)
        })
      }
    }
  };
};

export const createErrorResponse = (description: string, message: string) => {
  return {
    description,
    content: {
      'application/json': {
        schema: z.object({
          success: z.boolean().openapi({ example: false }),
          message: z.string().openapi({ example: message }),
          errorSources: z
            .array(
              z.object({
                path: z.string(),
                message: z.string()
              })
            )
            .openapi({ example: [{ path: '', message }] })
        })
      }
    }
  };
};

// Common Errors
export const Error400 = createErrorResponse('Bad Request / Validation Error', 'Validation failed.');
export const Error401 = createErrorResponse('Unauthorized', 'You are not authorized.');
export const Error403 = createErrorResponse('Forbidden', 'You do not have permission to access this resource.');
export const Error404 = createErrorResponse('Not Found', 'Resource not found.');
export const Error409 = createErrorResponse('Conflict', 'Resource already exists.');
export const Error500 = createErrorResponse('Internal Server Error', 'Something went wrong.');
