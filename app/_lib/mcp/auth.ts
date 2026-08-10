import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from '@lib/supabase/config';
import { getMcpResourceAudience } from './config';
import { McpDomainError } from './errors';

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new McpDomainError('UNAUTHENTICATED', 'A bearer access token is required.');
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) throw new McpDomainError('UNAUTHENTICATED', 'A bearer access token is required.');
  return token;
}

export function createBearerClient(accessToken: string) {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export function isGoogleMcpUser(user: {
  is_anonymous?: boolean;
  identities?: Array<{ provider?: string }>;
}) {
  return user.is_anonymous !== true && user.identities?.some(identity => identity.provider === 'google') === true;
}

function hasAudience(audience: unknown, expected: string) {
  return typeof audience === 'string'
    ? audience === expected
    : Array.isArray(audience) && audience.includes(expected);
}

export async function authenticateMcpRequest(request: Request) {
  const accessToken = readBearerToken(request);
  const supabase = createBearerClient(accessToken);
  const [{ data: claimsData, error: claimsError }, { data: userData, error: userError }] =
    await Promise.all([supabase.auth.getClaims(accessToken), supabase.auth.getUser(accessToken)]);

  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  if (claimsError || userError || !claims || !userData.user) {
    throw new McpDomainError('UNAUTHENTICATED', 'The access token is invalid or expired.');
  }

  const expectedAudience = getMcpResourceAudience();
  if (!expectedAudience) {
    throw new McpDomainError('UNAUTHENTICATED', 'MCP authentication is not configured.');
  }
  if (!hasAudience(claims.aud, expectedAudience)) {
    throw new McpDomainError('UNAUTHENTICATED', 'The access token is for another resource.');
  }
  if (claims.sub !== userData.user.id || claims.role !== 'authenticated') {
    throw new McpDomainError('UNAUTHENTICATED', 'The access token identity is invalid.');
  }
  if (!isGoogleMcpUser(userData.user)) {
    throw new McpDomainError(
      'UNAUTHENTICATED',
      'A connected Google account is required to use Xpensed MCP.'
    );
  }
  if (!claims.client_id && process.env.MCP_ALLOW_DIRECT_USER_TOKENS !== 'true') {
    throw new McpDomainError('UNAUTHENTICATED', 'An OAuth client access token is required.');
  }

  return {
    supabase,
    userId: userData.user.id,
    clientId: typeof claims.client_id === 'string' ? claims.client_id : null,
  };
}

export type McpAuthContext = Awaited<ReturnType<typeof authenticateMcpRequest>>;
