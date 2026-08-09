import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@lib/supabase/server';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
  );
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  if (!process.env.RESEND_API_KEY || !process.env.INVITE_FROM_EMAIL) {
    return NextResponse.json(
      { error: 'Email is not configured. Copy and send the invitation link instead.' },
      { status: 501 }
    );
  }
  const { invitationId, link } = await request.json();
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
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  await supabase
    .from('space_invitations')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('id', invitationId);
  return NextResponse.json({ sent: true });
}
