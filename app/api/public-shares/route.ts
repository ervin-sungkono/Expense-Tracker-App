import { NextRequest, NextResponse } from 'next/server';
import {
  isUuid,
  createPublicShareToken,
  publicShareTokenHashDatabaseValue,
} from '@lib/public-share/server';
import type { PublicShareStatus } from '@lib/public-share/types';
import { createClient } from '@lib/supabase/server';
import { enforceRateLimit, isRateLimitResponse } from '@lib/rate-limit';
import { readJsonBody, requireSameOrigin } from '@lib/request-security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type PublicShareRow = {
  space_id: string;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
};

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

async function canManagePublicShare(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('status', 'active')
    .maybeSingle();

  return !error && Boolean(data);
}

function toStatus(row: PublicShareRow | null, spaceId: string): PublicShareStatus {
  return {
    spaceId,
    active: Boolean(row && !row.revoked_at),
    createdAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
    revokedAt: row?.revoked_at ?? null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedClient();
  if (!auth) return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  for (const policy of [
    { scope: 'public-shares-read-ip', limit: 120, windowSeconds: 60 },
    { scope: 'public-shares-read-user', subject: auth.user.id, limit: 60, windowSeconds: 60 },
  ]) {
    const rateLimit = await enforceRateLimit(request, policy);
    if (isRateLimitResponse(rateLimit)) return rateLimit;
  }

  const spaceId = request.nextUrl.searchParams.get('spaceId');
  if (!isUuid(spaceId))
    return noStoreJson({ error: 'A valid space ID is required.' }, { status: 400 });
  if (!(await canManagePublicShare(auth.supabase, spaceId, auth.user.id))) {
    return noStoreJson({ error: 'Space access denied.' }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from('space_public_shares')
    .select('space_id,created_at,updated_at,revoked_at')
    .eq('space_id', spaceId)
    .maybeSingle();
  if (error) return noStoreJson({ error: 'Unable to load public sharing.' }, { status: 500 });

  return noStoreJson(toStatus(data as PublicShareRow | null, spaceId));
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await getAuthenticatedClient();
  if (!auth) return noStoreJson({ error: 'Authentication required.' }, { status: 401 });

  for (const policy of [
    { scope: 'public-shares-create-ip', limit: 20, windowSeconds: 60 },
    { scope: 'public-shares-create-user', subject: auth.user.id, limit: 5, windowSeconds: 60 },
  ]) {
    const rateLimit = await enforceRateLimit(request, policy);
    if (isRateLimitResponse(rateLimit)) return rateLimit;
  }

  const bodyResult = await readJsonBody<{ spaceId?: string }>(request, 4096);
  if (bodyResult.response) return bodyResult.response;
  const body = bodyResult.data;

  if (!isUuid(body.spaceId))
    return noStoreJson({ error: 'A valid space ID is required.' }, { status: 400 });
  const spaceRateLimit = await enforceRateLimit(request, {
    scope: 'public-shares-create-space-hour',
    subject: `${auth.user.id}:${body.spaceId}`,
    limit: 20,
    windowSeconds: 3600,
  });
  if (isRateLimitResponse(spaceRateLimit)) return spaceRateLimit;
  if (!(await canManagePublicShare(auth.supabase, body.spaceId, auth.user.id))) {
    return noStoreJson({ error: 'Space access denied.' }, { status: 403 });
  }

  const token = createPublicShareToken();
  const tokenHash = publicShareTokenHashDatabaseValue(token);
  const { data: existing, error: existingError } = await auth.supabase
    .from('space_public_shares')
    .select('space_id')
    .eq('space_id', body.spaceId)
    .maybeSingle();
  if (existingError)
    return noStoreJson({ error: 'Unable to create public sharing.' }, { status: 500 });

  const mutation = existing
    ? auth.supabase
        .from('space_public_shares')
        .update({ token_hash: tokenHash, revoked_at: null })
        .eq('space_id', body.spaceId)
        .select('space_id,created_at,updated_at,revoked_at')
        .single()
    : auth.supabase
        .from('space_public_shares')
        .insert({ space_id: body.spaceId, token_hash: tokenHash, created_by: auth.user.id })
        .select('space_id,created_at,updated_at,revoked_at')
        .single();
  const { data, error } = await mutation;
  if (error || !data)
    return noStoreJson({ error: 'Unable to create public sharing.' }, { status: 500 });

  return noStoreJson({
    ...toStatus(data as PublicShareRow, body.spaceId),
    token,
  });
}

export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await getAuthenticatedClient();
  if (!auth) return noStoreJson({ error: 'Authentication required.' }, { status: 401 });

  for (const policy of [
    { scope: 'public-shares-delete-ip', limit: 20, windowSeconds: 60 },
    { scope: 'public-shares-delete-user', subject: auth.user.id, limit: 10, windowSeconds: 60 },
  ]) {
    const rateLimit = await enforceRateLimit(request, policy);
    if (isRateLimitResponse(rateLimit)) return rateLimit;
  }

  const bodyResult = await readJsonBody<{ spaceId?: string }>(request, 4096);
  if (bodyResult.response) return bodyResult.response;
  const body = bodyResult.data;

  if (!isUuid(body.spaceId))
    return noStoreJson({ error: 'A valid space ID is required.' }, { status: 400 });
  if (!(await canManagePublicShare(auth.supabase, body.spaceId, auth.user.id))) {
    return noStoreJson({ error: 'Space access denied.' }, { status: 403 });
  }

  const { data, error } = await auth.supabase
    .from('space_public_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('space_id', body.spaceId)
    .is('revoked_at', null)
    .select('space_id,created_at,updated_at,revoked_at')
    .maybeSingle();
  if (error) return noStoreJson({ error: 'Unable to disable public sharing.' }, { status: 500 });

  return noStoreJson(toStatus(data as PublicShareRow | null, body.spaceId));
}
