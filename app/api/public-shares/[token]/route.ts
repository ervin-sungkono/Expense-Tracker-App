import { NextRequest, NextResponse } from 'next/server';
import { publicShareTokenHashDatabaseValue } from '@lib/public-share/server';
import type {
  PublicShareBudget,
  PublicShareCategory,
  PublicShareTransaction,
  PublicSpaceSnapshot,
} from '@lib/public-share/types';
import { createSecretClient } from '@lib/supabase/server';
import { enforceRateLimit, isRateLimitResponse } from '@lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_SIZE = 500;
const MAX_RECORDS = 5000;

type SpaceRecord = {
  id: string;
  entity_type: 'transaction' | 'category' | 'budget';
  payload: Record<string, unknown> | null;
};

function notFound() {
  return NextResponse.json(
    { error: 'This public link is unavailable.' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } }
  );
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toCategory(record: SpaceRecord): PublicShareCategory {
  const payload = record.payload ?? {};
  return {
    id: record.id,
    name: stringValue(payload.name) ?? 'Unnamed category',
    type: stringValue(payload.type),
    icon: stringValue(payload.icon),
    color: stringValue(payload.color),
    parentId: stringValue(payload.parentId),
  };
}

function toTransaction(record: SpaceRecord): PublicShareTransaction {
  const payload = record.payload ?? {};
  return {
    id: record.id,
    date: stringValue(payload.date),
    amount: numberValue(payload.amount),
    type: stringValue(payload.type),
    categoryId: stringValue(payload.categoryId),
  };
}

function toBudget(record: SpaceRecord): PublicShareBudget {
  const payload = record.payload ?? {};
  return {
    id: record.id,
    amount: numberValue(payload.amount),
    startDate: stringValue(payload.start_date),
    endDate: stringValue(payload.end_date),
    categoryId: stringValue(payload.categoryId),
    repeat: payload.repeat ?? null,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 40 || token.length > 200 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return notFound();
  }
  for (const policy of [
    { scope: 'public-share-snapshot-ip', limit: 30, windowSeconds: 60 },
    {
      scope: 'public-share-snapshot-token',
      subject: publicShareTokenHashDatabaseValue(token),
      limit: 120,
      windowSeconds: 600,
    },
  ]) {
    const rateLimit = await enforceRateLimit(request, policy);
    if (isRateLimitResponse(rateLimit)) return rateLimit;
  }

  const admin = createSecretClient();
  const { data: share, error: shareError } = await admin
    .from('space_public_shares')
    .select('space_id')
    .eq('token_hash', publicShareTokenHashDatabaseValue(token))
    .is('revoked_at', null)
    .maybeSingle();
  if (shareError || !share) return notFound();

  const { data: space, error: spaceError } = await admin
    .from('spaces')
    .select('id,name')
    .eq('id', share.space_id)
    .is('deleting_at', null)
    .maybeSingle();
  if (spaceError || !space) return notFound();

  const records: SpaceRecord[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin
      .from('space_records')
      .select('id,entity_type,payload')
      .eq('space_id', share.space_id)
      .is('deleted_at', null)
      .in('entity_type', ['transaction', 'category', 'budget'])
      .order('server_revision', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) return notFound();
    records.push(...((data ?? []) as SpaceRecord[]));
    if (records.length >= MAX_RECORDS) {
      records.length = MAX_RECORDS;
      break;
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  const snapshot: PublicSpaceSnapshot = {
    space: { id: space.id, name: space.name },
    categories: records.filter(record => record.entity_type === 'category').map(toCategory),
    transactions: records.filter(record => record.entity_type === 'transaction').map(toTransaction),
    budgets: records.filter(record => record.entity_type === 'budget').map(toBudget),
  };

  return NextResponse.json(snapshot, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
