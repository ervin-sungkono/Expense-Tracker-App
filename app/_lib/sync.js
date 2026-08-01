import { db } from '@lib/db';
import { decryptPayload, encryptPayload } from '@lib/crypto';
import { byteaToBase64 } from '@lib/supabase/binary';

function revivePayload(entityType, payload) {
    if (entityType === 'transaction' && payload.date) payload.date = new Date(payload.date);
    if (entityType === 'budget') {
        if (payload.start_date) payload.start_date = new Date(payload.start_date);
        if (payload.end_date) payload.end_date = new Date(payload.end_date);
    }
    return payload;
}

async function pullChanges({ supabase, user, space, spaceKey }) {
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

        await db.applyRemoteRows(user.id, space.id, data, async row => {
            const payload = await decryptPayload(spaceKey, {
                ciphertext: byteaToBase64(row.ciphertext),
                iv: byteaToBase64(row.iv),
                schemaVersion: row.payload_schema_version,
                keyVersion: row.space_key_version,
            }, {
                spaceId: row.space_id,
                entityType: row.entity_type,
                recordId: row.id,
            });
            return revivePayload(row.entity_type, payload);
        });
        cursor = Number(data[data.length - 1].server_revision);
        if (data.length < 500) break;
    }
}

async function prepareMutation(mutation, spaceKey, keyVersion) {
    if (mutation.operation === 'delete') return mutation;
    if (mutation.envelope) return mutation;
    const payload = await db.getMutationPayload(mutation);
    const envelope = await encryptPayload(spaceKey, payload, {
        spaceId: mutation.spaceId,
        entityType: mutation.entityType,
        recordId: mutation.entityId,
        schemaVersion: 1,
        keyVersion,
    });
    await db.freezeMutation(mutation.mutationId, envelope);
    return { ...mutation, envelope };
}

async function pushChanges({ supabase, user, space, spaceKey }) {
    const pending = await db.getPendingMutations(user.id, space.id);
    const groups = new Map();
    for (const mutation of pending) {
        const prepared = await prepareMutation(mutation, spaceKey, space.current_key_version);
        if (!groups.has(prepared.groupId)) groups.set(prepared.groupId, []);
        groups.get(prepared.groupId).push(prepared);
    }

    for (const mutations of groups.values()) {
        const payload = mutations.map(mutation => ({
            mutation_id: mutation.mutationId,
            group_id: mutation.groupId,
            space_id: mutation.spaceId,
            entity_type: mutation.entityType,
            record_id: mutation.entityId,
            operation: mutation.operation,
            base_version: mutation.baseVersion,
            ciphertext: mutation.envelope?.ciphertext ?? null,
            iv: mutation.envelope?.iv ?? null,
            crypto_version: mutation.envelope?.cryptoVersion ?? 1,
            schema_version: mutation.envelope?.schemaVersion ?? 1,
            key_version: mutation.envelope?.keyVersion ?? space.current_key_version,
        }));
        const { data, error } = await supabase.rpc('apply_space_mutations', { mutations: payload });
        if (error) {
            if (error.code === '40001') {
                const ids = mutations.map(item => item.entityId);
                const { data: remoteRows } = await supabase.from('space_records').select('*').in('id', ids);
                for (const mutation of mutations) {
                    const local = await db.getMutationPayload(mutation);
                    await db.saveConflict(mutation, remoteRows?.find(row => row.id === mutation.entityId) ?? null, local);
                }
                continue;
            }
            throw error;
        }
        await db.markMutationsSynced(data ?? [], mutations.map(item => item.mutationId));
    }
}

async function performSync(options) {
    await pullChanges(options);
    await pushChanges(options);
    await pullChanges(options);
}

export async function syncSpace(options) {
    if (!options.user || !options.space || !options.spaceKey) return;
    const lockName = `xpensed-sync:${options.user.id}:${options.space.id}`;
    if (globalThis.navigator?.locks) {
        return navigator.locks.request(lockName, { mode: 'exclusive' }, () => performSync(options));
    }
    return performSync(options);
}
