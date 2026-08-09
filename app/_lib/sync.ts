import { db } from '@lib/db';

function revivePayload(entityType, payload) {
  if (!payload) return payload;
  if (entityType === 'transaction' && payload.date) payload.date = new Date(payload.date);
  if (entityType === 'budget') {
    if (payload.start_date) payload.start_date = new Date(payload.start_date);
    if (payload.end_date) payload.end_date = new Date(payload.end_date);
  }
  return payload;
}

async function pullChanges({ supabase, user, space }) {
  let cursor = await db.getCursor(user.id, space.id);
  while (true) {
    const { data, error } = await supabase
      .from('space_records')
      .select('*')
      .eq('space_id', space.id)
      .gt('server_revision', cursor)
      .order('server_revision', { ascending: true })
      .limit(500);
    if (error) throw error;
    if (!data?.length) break;

    await db.applyRemoteRows(
      user.id,
      space.id,
      data.map(row => ({ ...row, payload: revivePayload(row.entity_type, row.payload) }))
    );
    cursor = Number(data[data.length - 1].server_revision);
    if (data.length < 500) break;
  }
}

async function pushChanges({ supabase, user, space }) {
  const pending = await db.getPendingMutations(user.id, space.id);
  const groups = new Map();
  for (const mutation of pending) {
    if (!groups.has(mutation.groupId)) groups.set(mutation.groupId, []);
    groups.get(mutation.groupId).push(mutation);
  }

  for (const mutations of groups.values()) {
    const payload = await Promise.all(
      mutations.map(async mutation => ({
        mutation_id: mutation.mutationId,
        group_id: mutation.groupId,
        space_id: mutation.spaceId,
        entity_type: mutation.entityType,
        record_id: mutation.entityId,
        operation: mutation.operation,
        base_version: mutation.baseVersion,
        payload: mutation.operation === 'delete' ? null : await db.getMutationPayload(mutation),
      }))
    );
    const { data, error } = await supabase.rpc('apply_space_mutations', { mutations: payload });
    if (error) {
      if (error.code === '40001') {
        const ids = mutations.map(item => item.entityId);
        const { data: remoteRows } = await supabase.from('space_records').select('*').in('id', ids);
        for (const mutation of mutations) {
          const local = await db.getMutationPayload(mutation);
          await db.saveConflict(
            mutation,
            remoteRows?.find(row => row.id === mutation.entityId) ?? null,
            local
          );
        }
        continue;
      }
      throw error;
    }
    await db.markMutationsSynced(
      data ?? [],
      mutations.map(item => item.mutationId)
    );
  }
}

async function performSync(options) {
  await pullChanges(options);
  await pushChanges(options);
  await pullChanges(options);
}

export async function syncSpace(options) {
  if (!options.user || !options.space) return;
  const lockName = `xpensed-sync:${options.user.id}:${options.space.id}`;
  if (globalThis.navigator?.locks) {
    return navigator.locks.request(lockName, { mode: 'exclusive' }, () => performSync(options));
  }
  return performSync(options);
}
