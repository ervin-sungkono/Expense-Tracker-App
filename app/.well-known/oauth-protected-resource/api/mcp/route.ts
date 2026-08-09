import { getMcpResourceAudience } from '@lib/mcp/config';

export const dynamic = 'force-dynamic';

export function GET() {
  const resource = getMcpResourceAudience();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!resource || !supabaseUrl) {
    return Response.json({ error: 'MCP authentication is not configured.' }, { status: 503 });
  }

  return Response.json(
    {
      resource,
      authorization_servers: [`${supabaseUrl.replace(/\/$/, '')}/auth/v1`],
      scopes_supported: ['openid'],
      bearer_methods_supported: ['header'],
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
