import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  // Mongoose invalid ObjectId / CastError
  if (err && typeof err === 'object' && (err as { name?: string }).name === 'CastError') {
    res.status(400).json({
      error: {
        code: 'INVALID_ID',
        message: 'Invalid resource identifier format',
      },
    });
    return;
  }

  // MongoDB duplicate key conflict
  if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with these unique details already exists',
      },
    });
    return;
  }

  // Multer upload limit errors
  if (err && typeof err === 'object' && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded receipt file exceeds the maximum allowed size.',
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as { status?: number })?.status ?? 500;
  if (status >= 500) {
    console.error('[ClaimVault API Error]', err);
  }
  res.status(status).json({
    error: {
      code: status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    },
  });
}
