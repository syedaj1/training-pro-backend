import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Handle SQLite unique constraint errors
  if (err.message?.includes('UNIQUE constraint failed')) {
    res.status(409).json({
      success: false,
      error: 'A record with this value already exists'
    });
    return;
  }

  // Handle SQLite foreign key constraint errors
  if (err.message?.includes('FOREIGN KEY constraint failed')) {
    res.status(400).json({
      success: false,
      error: 'Referenced record does not exist'
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Resource not found'
  });
}

// Async handler wrapper to catch errors in async route handlers
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
