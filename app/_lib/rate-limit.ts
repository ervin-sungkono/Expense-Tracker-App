import { createHmac } from 'node:crypto';
import { createSecretClient } from '@lib/supabase/server';

type RateLimitOptions = {
  scope: string;
  limit: number;
  windowSeconds: number;
  subject?: string;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retry_after: number;
};

function clientIp(request: Request) {
  return (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function rateLimitHeaders(result: RateLimitResult) {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(result.retry_after),
  };
}

export async function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json(
      { error: 'Rate limiting is not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const subject = options.subject ? `user:${options.subject}` : `ip:${clientIp(request)}`;
  const bucketHash = createHmac('sha256', secret)
    .update(`${options.scope}:${subject}`)
    .digest('hex');

  try {
    const admin = createSecretClient();
    const { data, error } = await admin.rpc('consume_api_rate_limit', {
      target_bucket_hash: bucketHash,
      max_requests: options.limit,
      window_seconds: options.windowSeconds,
    });
    if (error || !data) throw error ?? new Error('Empty rate limit response.');
    const result = data as RateLimitResult;
    if (!result.allowed) {
      return Response.json(
        { error: 'Too many requests. Try again later.' },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(result),
            'Retry-After': String(result.retry_after),
            'Cache-Control': 'no-store',
          },
        }
      );
    }
    return { headers: rateLimitHeaders(result) };
  } catch {
    return Response.json(
      { error: 'Request protection is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export function isRateLimitResponse(
  result: Awaited<ReturnType<typeof enforceRateLimit>>
): result is Response {
  return result instanceof Response;
}
