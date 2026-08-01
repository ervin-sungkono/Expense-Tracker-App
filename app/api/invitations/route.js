import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient, createSecretClient } from '@lib/supabase/server';

export const dynamic = 'force-dynamic';

function tokenHash(token) {
  return createHash('sha256').update(token).digest('base64');
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
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Invitation token is missing.' }, { status: 400 });

  const admin = createSecretClient();
  const { data, error } = await admin
    .from('space_invitations')
    .select(
      'id,space_id,invited_email,role,encrypted_space_key,key_iv,space_key_version,expires_at,accepted_at,revoked_at,spaces(name)'
    )
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
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await request.json();
  if (!body.token || !body.wrappedSpaceKey) {
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
    recipient_wrapped_key_base64: body.wrappedSpaceKey,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
