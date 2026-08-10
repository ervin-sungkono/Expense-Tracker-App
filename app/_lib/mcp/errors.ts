export type McpErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNSUPPORTED_CURRENCY'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class McpDomainError extends Error {
  constructor(
    public code: McpErrorCode,
    message: string,
    public correlationId = crypto.randomUUID()
  ) {
    super(message);
  }
}

export function mapSupabaseError(error: { code?: string; message?: string }) {
  const message = error.message ?? 'The request could not be completed.';
  if (error.code === '28000')
    return new McpDomainError('UNAUTHENTICATED', 'Authentication failed.');
  if (error.code === '23514' && message.includes('at most three spaces')) {
    return new McpDomainError('VALIDATION_FAILED', 'You already own the maximum of 3 spaces.');
  }
  if (error.code === '42501') return new McpDomainError('FORBIDDEN', 'You do not have permission.');
  if (error.code === '53300') {
    return new McpDomainError('RATE_LIMITED', 'Too many mutation attempts. Retry later.');
  }
  if (error.code === '40001' || error.code === '23505') {
    return new McpDomainError('CONFLICT', 'The record changed or already exists. Retry safely.');
  }
  if (error.code === '22023') {
    if (message.includes('Only IDR')) {
      return new McpDomainError('UNSUPPORTED_CURRENCY', 'Only IDR transactions are supported.');
    }
    return new McpDomainError('VALIDATION_FAILED', message);
  }
  return new McpDomainError('INTERNAL_ERROR', 'The request could not be completed.');
}

export function toolError(error: unknown) {
  const safeError =
    error instanceof McpDomainError
      ? error
      : new McpDomainError('INTERNAL_ERROR', 'The request could not be completed.');

  return {
    isError: true as const,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: safeError.code,
          message: safeError.message,
          correlation_id: safeError.correlationId,
        }),
      },
    ],
  };
}
