import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient, createSecretClient } from '@lib/supabase/server';
import { enforceRateLimit, isRateLimitResponse } from '@lib/rate-limit';
import { readJsonBody, requireSameOrigin } from '@lib/request-security';

export const dynamic = 'force-dynamic';

function tokenHash(token) {
  return createHash('sha256').update(token).digest('base64');
}

function validInvitationToken(token) {
  return typeof token === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(token);
}

async function authenticatedUser() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  for (const policy of [
    { scope: 'invitations-read-ip', limit: 60, windowSeconds: 60 },
    { scope: 'invitations-read-user', subject: user.id, limit: 30, windowSeconds: 60 },
  ]) {
    const rateLimit = await enforceRateLimit(request, policy);
    if (isRateLimitResponse(rateLimit)) return rateLimit;
  }
  const token = new URL(request.url).searchParams.get('token');
  if (!validInvitationToken(token)) {
    return NextResponse.json({ error: 'Invitation token is invalid.' }, { status: 400 });
  }

  const admin = createSecretClient();
  const { data, error } = await admin
    .from('space_invitations')
    .select('id,space_id,invited_email,role,expires_at,accepted_at,revoked_at,spaces(name)')
    .eq('token_hash', `\\x${Buffer.from(tokenHash(token), 'base64').toString('hex')}`)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Unable to load invitation.' }, { status: 500 });
  const email = user.email?.trim().toLowerCase();
  if (
    !data ||
    data.invited_email !== email ||
    data.revoked_at ||
    data.accepted_at ||
    new Date(data.expires_at) <= new Date()
  ) {
    return NextResponse.json(
      { error: 'This invitation is invalid, expired, or belongs to another email.' },
      { status: 403 }
    );
  }
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  for (const policy of [
    { scope: 'invitations-accept-ip', limit: 20, windowSeconds: 60 },
    { scope: 'invitations-accept-user', subject: user.id, limit: 10, windowSeconds: 60 },
  ]) {
    const rateLimit = await enforceRateLimit(request, policy);
    if (isRateLimitResponse(rateLimit)) return rateLimit;
  }
  const bodyResult = await readJsonBody<{ token?: unknown }>(request, 4096);
  if (bodyResult.response) return bodyResult.response;
  const body = bodyResult.data;
  if (!validInvitationToken(body.token)) {
    return NextResponse.json(
      { error: 'Invitation acceptance payload is incomplete.' },
      { status: 400 }
    );
  }
  const admin = createSecretClient();
  const { data, error } = await admin.rpc('accept_space_invitation', {
    invitation_token_hash_base64: tokenHash(body.token),
    recipient_user_id: user.id,
    recipient_email: user.email,
  });
  if (error) return NextResponse.json({ error: 'Unable to accept invitation.' }, { status: 400 });
  return NextResponse.json(data);
}
