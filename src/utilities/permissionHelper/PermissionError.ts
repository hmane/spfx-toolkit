/**
 * Error class for permission-related errors
 * Provides structured error handling with error codes and additional details
 */
export class PermissionError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'PERMISSION_ERROR', details?: unknown) {
    super(message);
    this.name = 'PermissionError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, PermissionError);
    }
  }

  /**
   * Convert error to JSON for logging or serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * Create a PermissionError from an unknown error
   */
  static fromError(error: unknown, code?: string): PermissionError {
    if (error instanceof PermissionError) {
      return error;
    }

    if (error instanceof Error) {
      return new PermissionError(error.message, code || 'UNKNOWN_ERROR', { originalError: error });
    }

    return new PermissionError(
      typeof error === 'string' ? error : 'Unknown error occurred',
      code || 'UNKNOWN_ERROR',
      { originalError: error }
    );
  }
}
