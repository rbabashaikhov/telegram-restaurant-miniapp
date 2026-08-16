export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorBody(error: unknown): {
  ok: false;
  error: { code: string; message: string; details?: unknown };
} {
  if (error instanceof AppError) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    };
  }
  return {
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  };
}

export function statusFromError(error: unknown, fallback = 500): number {
  if (error instanceof AppError) return error.status;
  return fallback;
}
