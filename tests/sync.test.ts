import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db } = vi.hoisted(() => ({
  db: {
    getCursor: vi.fn(),
    applyRemoteRows: vi.fn(),
    getPendingMutations: vi.fn(),
    getMutationPayload: vi.fn(),
    markMutationsSynced: vi.fn(),
    saveConflict: vi.fn(),
  },
}));

vi.mock('@lib/db', () => ({ db }));

import { syncSpace } from '@lib/sync';

const user = { id: 'user-1' };
const space = { id: 'space-1' };

function createSupabase({ pullRows = [], rpcResult = { data: [], error: null } } = {}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: pullRows, error: null })),
    in: vi.fn(async () => ({ data: [] })),
  };
  return {
    from: vi.fn(() => query),
    rpc: vi.fn(async () => rpcResult),
  };
}

describe('syncSpace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getCursor.mockResolvedValue(0);
    db.getPendingMutations.mockResolvedValue([]);
  });

  it('does nothing without a signed-in user or selected space', async () => {
    await expect(syncSpace({ supabase: createSupabase() })).resolves.toBeUndefined();
  });

  it('pulls remote records before and after pushing pending mutations', async () => {
    const mutation = {
      mutationId: 'mutation-1',
      groupId: 'group-1',
      spaceId: space.id,
      entityType: 'transaction',
      entityId: 'record-1',
      operation: 'upsert',
      baseVersion: 0,
    };
    db.getPendingMutations.mockResolvedValue([mutation]);
    db.getMutationPayload.mockResolvedValue({ amount: 120, date: new Date(2026, 0, 1) });
    const supabase = createSupabase({
      rpcResult: { data: [{ id: 'record-1', version: 1, server_revision: 1 }], error: null },
    });

    await syncSpace({ supabase, user, space });

    expect(supabase.rpc).toHaveBeenCalledWith('apply_space_mutations', {
      mutations: [
        expect.objectContaining({
          mutation_id: 'mutation-1',
          payload: { amount: 120, date: new Date(2026, 0, 1) },
        }),
      ],
    });
    expect(db.markMutationsSynced).toHaveBeenCalledWith(
      [{ id: 'record-1', version: 1, server_revision: 1 }],
      ['mutation-1']
    );
    expect(supabase.from).toHaveBeenCalledWith('space_records');
  });

  it('marks conflicts when Supabase reports a serialization conflict', async () => {
    const mutation = {
      mutationId: 'mutation-1',
      groupId: 'group-1',
      spaceId: space.id,
      entityType: 'transaction',
      entityId: 'record-1',
      operation: 'upsert',
      baseVersion: 0,
    };
    db.getPendingMutations.mockResolvedValue([mutation]);
    db.getMutationPayload.mockResolvedValue({ amount: 120 });
    const supabase = createSupabase({ rpcResult: { data: null, error: { code: '40001' } } });

    await syncSpace({ supabase, user, space });

    expect(db.saveConflict).toHaveBeenCalledWith(mutation, null, { amount: 120 });
  });

  it('throws unexpected Supabase errors', async () => {
    const mutation = {
      mutationId: 'mutation-1',
      groupId: 'group-1',
      spaceId: space.id,
      entityType: 'transaction',
      entityId: 'record-1',
      operation: 'delete',
      baseVersion: 0,
    };
    db.getPendingMutations.mockResolvedValue([mutation]);
    const error = new Error('network failed');
    await expect(
      syncSpace({ supabase: createSupabase({ rpcResult: { data: null, error } }), user, space })
    ).rejects.toThrow('network failed');
  });
});
