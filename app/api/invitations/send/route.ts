import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@lib/supabase/server';
import { enforceRateLimit, isRateLimitResponse } from '@lib/rate-limit';
import { readJsonBody, requireSameOrigin } from '@lib/request-security';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  );
}

export async function POST(request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  for (const policy of [
    { scope: 'invitation-email-ip-10m', limit: 10, windowSeconds: 600 },
    { scope: 'invitation-email-user-10m', subject: auth.user.id, limit: 3, windowSeconds: 600 },
    { scope: 'invitation-email-user-day', subject: auth.user.id, limit: 20, windowSeconds: 86400 },
  ]) {
    const rateLimit = await enforceRateLimit(request, policy);
    if (isRateLimitResponse(rateLimit)) return rateLimit;
  }
  if (!process.env.RESEND_API_KEY || !process.env.INVITE_FROM_EMAIL) {
    return NextResponse.json(
      { error: 'Email is not configured. Copy and send the invitation link instead.' },
      { status: 501 }
    );
  }
  const body = await readJsonBody<{ invitationId?: unknown; link?: unknown }>(request, 4096);
  if (body.response) return body.response;
  const { invitationId, link } = body.data;
  if (
    typeof invitationId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(invitationId) ||
    typeof link !== 'string'
  ) {
    return NextResponse.json({ error: 'Invitation payload is invalid.' }, { status: 400 });
  }
  const trustedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin;
  let invitationUrl;
  try {
    invitationUrl = new URL(link);
  } catch {
    return NextResponse.json({ error: 'Invitation link is invalid.' }, { status: 400 });
  }
  if (invitationUrl.origin !== trustedOrigin || invitationUrl.pathname !== '/invite') {
    return NextResponse.json({ error: 'Invitation link is invalid.' }, { status: 400 });
  }
  const { data: invite } = await supabase
    .from('space_invitations')
    .select('invited_email,spaces(name)')
    .eq('id', invitationId)
    .single();
  if (!invite) return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.INVITE_FROM_EMAIL,
    to: invite.invited_email,
    subject: `Join ${invite.spaces.name} on Xpensed`,
    html: `<p>You were invited to <strong>${escapeHtml(invite.spaces.name)}</strong>.</p><p><a href="${escapeHtml(link)}">Accept invitation</a></p><p>This link expires in 7 days. If you did not expect it, ignore this email.</p>`,
  });
  if (error) return NextResponse.json({ error: 'Unable to send invitation email.' }, { status: 502 });
  await supabase
    .from('space_invitations')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('id', invitationId);
  return NextResponse.json({ sent: true });
}
