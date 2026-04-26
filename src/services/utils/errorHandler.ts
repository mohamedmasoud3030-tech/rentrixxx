// Professional Error Handler - Centralized error management

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} غير موجود: ${id}` : `${resource} غير موجود`;
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'غير مصرح بهذا الإجراء') {
    super('UNAUTHORIZED', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}

export const handleError = (error: any): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.code === 'PGRST116') {
    return new NotFoundError('Resource');
  }

  if (error?.message?.includes('permission denied')) {
    return new AuthorizationError();
  }

  return new AppError(
    'UNKNOWN_ERROR',
    error?.message || 'حدث خطأ غير متوقع',
    error?.status || 500
  );
};
