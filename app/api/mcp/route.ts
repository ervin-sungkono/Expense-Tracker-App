import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { authenticateMcpRequest } from '@lib/mcp/auth';
import { getMcpAllowedOrigins, getMcpResourceAudience } from '@lib/mcp/config';
import { McpDomainError } from '@lib/mcp/errors';
import { createExpenseMcpServer } from '@lib/mcp/server';
import { enforceRateLimit, isRateLimitResponse } from '@lib/rate-limit';
import { boundedRequest } from '@lib/request-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };

function metadataUrl() {
  const resource = new URL(getMcpResourceAudience()!);
  return new URL(
    `/.well-known/oauth-protected-resource${resource.pathname}`,
    resource.origin
  ).toString();
}

function unauthorized(error: unknown) {
  const message = error instanceof McpDomainError ? error.message : 'Authentication failed.';
  return Response.json(
    { error: 'unauthorized', error_description: message },
    {
      status: 401,
      headers: {
        ...noStoreHeaders,
        'WWW-Authenticate': `Bearer resource_metadata="${metadataUrl()}", scope="openid"`,
      },
    }
  );
}

function allowedOrigins() {
  return getMcpAllowedOrigins();
}

function callsTransactionWriteTool(message: unknown) {
  const messages = Array.isArray(message) ? message : [message];
  return messages.some(item => {
    if (!item || typeof item !== 'object') return false;
    const request = item as { method?: unknown; params?: { name?: unknown } };
    return (
      request.method === 'tools/call' &&
      typeof request.params?.name === 'string' &&
      [
        'xpensed_create_transaction_from_email',
        'xpensed_create_transaction',
        'xpensed_update_transaction',
        'xpensed_archive_transaction',
        'xpensed_restore_transaction',
        'xpensed_create_category',
        'xpensed_update_category',
        'xpensed_archive_category',
        'xpensed_restore_category',
        'xpensed_create_shop',
        'xpensed_update_shop',
        'xpensed_archive_shop',
        'xpensed_restore_shop',
      ].includes(request.params.name)
    );
  });
}

async function handle(request: Request, message: unknown) {
  if (!request.headers.get('authorization')?.startsWith('Bearer ')) {
    try {
      await authenticateMcpRequest(request);
    } catch (error) {
      return unauthorized(error);
    }
  }
  const ipLimit = await enforceRateLimit(request, {
    scope: 'mcp-ip',
    limit: 120,
    windowSeconds: 60,
  });
  if (isRateLimitResponse(ipLimit)) return ipLimit;

  let context;
  try {
    context = await authenticateMcpRequest(request);
  } catch (error) {
    return unauthorized(error);
  }

  const userLimit = await enforceRateLimit(request, {
    scope: 'mcp-user',
    subject: `${context.userId}:${context.clientId ?? 'direct'}`,
    limit: 60,
    windowSeconds: 60,
  });
  if (isRateLimitResponse(userLimit)) return userLimit;

  if (callsTransactionWriteTool(message)) {
    const writeLimit = await enforceRateLimit(request, {
      scope: 'mcp-transaction-write',
      subject: `${context.userId}:${context.clientId ?? 'direct'}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (isRateLimitResponse(writeLimit)) return writeLimit;

    const dailyWriteLimit = await enforceRateLimit(request, {
      scope: 'mcp-transaction-write-daily',
      subject: `${context.userId}:${context.clientId ?? 'direct'}`,
      limit: 500,
      windowSeconds: 86_400,
    });
    if (isRateLimitResponse(dailyWriteLimit)) return dailyWriteLimit;
  }

  const origins = allowedOrigins();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    enableDnsRebindingProtection: true,
    allowedOrigins: origins.length ? origins : undefined,
  });
  const server = createExpenseMcpServer(context);
  await server.connect(transport);

  try {
    const response = await transport.handleRequest(request);
    const headers = new Headers(response.headers);
    Object.entries(noStoreHeaders).forEach(([name, value]) => headers.set(name, value));
    return new Response(response.body, { status: response.status, headers });
  } finally {
    await transport.close();
    await server.close();
  }
}

export async function POST(request: Request) {
  if (!getMcpResourceAudience()) {
    return Response.json(
      { error: 'MCP authentication is not configured.' },
      { status: 503, headers: noStoreHeaders }
    );
  }
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim();
  if (contentType !== 'application/json') {
    return Response.json(
      { error: 'Content-Type must be application/json.' },
      { status: 415, headers: noStoreHeaders }
    );
  }

  const bounded = await boundedRequest(request, 256 * 1024);
  if ('response' in bounded) return bounded.response;

  let message: unknown;
  try {
    message = await bounded.request.clone().json();
  } catch {
    return Response.json(
      { error: 'A valid JSON-RPC request body is required.' },
      { status: 400, headers: noStoreHeaders }
    );
  }
  if (Array.isArray(message) && message.length > 10) {
    return Response.json(
      { error: 'JSON-RPC batches are limited to 10 messages.' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  return handle(bounded.request, message);
}

export async function GET(request: Request) {
  if (!getMcpResourceAudience()) {
    return Response.json(
      { error: 'MCP authentication is not configured.' },
      { status: 503, headers: noStoreHeaders }
    );
  }
  const rateLimit = await enforceRateLimit(request, {
    scope: 'mcp-methods-ip',
    limit: 30,
    windowSeconds: 60,
  });
  if (isRateLimitResponse(rateLimit)) return rateLimit;
  try {
    await authenticateMcpRequest(request);
  } catch (error) {
    return unauthorized(error);
  }
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'SSE is not enabled.' }, id: null },
    { status: 405, headers: noStoreHeaders }
  );
}

export async function DELETE(request: Request) {
  if (!getMcpResourceAudience()) {
    return Response.json(
      { error: 'MCP authentication is not configured.' },
      { status: 503, headers: noStoreHeaders }
    );
  }
  const rateLimit = await enforceRateLimit(request, {
    scope: 'mcp-methods-ip',
    limit: 30,
    windowSeconds: 60,
  });
  if (isRateLimitResponse(rateLimit)) return rateLimit;
  try {
    await authenticateMcpRequest(request);
  } catch (error) {
    return unauthorized(error);
  }
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32000, message: 'Sessions are not enabled.' }, id: null },
    { status: 405, headers: noStoreHeaders }
  );
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  const origins = allowedOrigins();
  if (origin && !origins.includes(origin)) {
    return Response.json(
      { error: 'Origin is not allowed.' },
      { status: 403, headers: { ...noStoreHeaders, Vary: 'Origin' } }
    );
  }

  const headers: Record<string, string> = {
    ...noStoreHeaders,
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    Vary: 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;

  return new Response(null, {
    status: 204,
    headers,
  });
}
