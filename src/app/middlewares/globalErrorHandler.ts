import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import AppError from '../errors/AppError';
import { logger } from '../utils/logger';

type ErrorSource = {
  path: string;
  message: string;
};

type ErrorWithCode = {
  code?: unknown;
  meta?: unknown;
};

const isErrorWithCode = (error: unknown): error is ErrorWithCode => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const getErrorCode = (error: unknown): unknown => (isErrorWithCode(error) ? error.code : undefined);

const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode = 500;
  let message = 'Something went wrong.';
  let errorSources: ErrorSource[] = [
    {
      path: '',
      message
    }
  ];

  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed.';
    errorSources = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [
      {
        path: '',
        message
      }
    ];
  } else if (getErrorCode(err) === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'Uploaded file exceeds the allowed size.';
    errorSources = [{ path: 'file', message }];
  } else if (err instanceof Error && err.message === 'Invalid file type for this upload.') {
    statusCode = 400;
    message = err.message;
    errorSources = [{ path: 'file', message }];
  } else if (isErrorWithCode(err) && err.code === 'P2002') {
    statusCode = 409;
    message = 'Duplicate resource.';
    errorSources = [
      {
        path: Array.isArray((err.meta as { target?: unknown })?.target)
          ? (err.meta as { target: string[] }).target.join('.')
          : '',
        message
      }
    ];
  } else if (err instanceof Error) {
    message = 'Something went wrong.';
    errorSources = [
      {
        path: '',
        message
      }
    ];
  }

  if (statusCode >= 500) {
    logger.error('Unhandled request error', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorSources
  });
};

export default globalErrorHandler;
