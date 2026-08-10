import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@lib/db';

const owner = { userId: 'user-1', spaceId: 'space-1', role: 'admin' };

describe('ExpenseDB', () => {
  beforeEach(async () => {
    await db.resetDB();
    await db.configureContext(owner);
  });

  it('requires an active space before writing records', async () => {
    await db.configureContext({});
    await expect(db.addTransaction({ amount: 100 })).rejects.toThrow(
      'Select a space before changing data.'
    );
  });

  it('stores scoped transactions and queues an outbox mutation', async () => {
    const id = await db.addTransaction({
      amount: 200,
      categoryId: 'food',
      date: new Date(2026, 0, 2),
    });
    const transactions = await db.getAllTransactions();
    const mutations = await db.getPendingMutations(owner.userId, owner.spaceId);

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      id,
      amount: 200,
      userId: owner.userId,
      spaceId: owner.spaceId,
    });
    expect(mutations[0]).toMatchObject({
      entityType: 'transaction',
      entityId: id,
      operation: 'upsert',
    });
    expect(await db.getMutationPayload(mutations[0])).toMatchObject({
      id,
      amount: 200,
      categoryId: 'food',
    });
  });

  it('rehomes local guest data without changing record or mutation ids', async () => {
    const guest = { userId: 'guest-user', spaceId: 'guest-space', role: 'admin' };
    const account = { userId: 'user-2', spaceId: 'space-2', role: 'admin' };
    await db.configureContext(guest);
    const transactionId = await db.addTransaction({ amount: 250, date: new Date(2026, 0, 2) });
    const [mutation] = await db.getPendingMutations(guest.userId, guest.spaceId);

    await db.rehomeContext({
      fromUserId: guest.userId,
      fromSpaceId: guest.spaceId,
      toUserId: account.userId,
      toSpaceId: account.spaceId,
    });

    expect(await db.transactions.get(transactionId)).toMatchObject({
      userId: account.userId,
      spaceId: account.spaceId,
    });
    expect(await db.getPendingMutations(account.userId, account.spaceId)).toMatchObject([
      { mutationId: mutation.mutationId, userId: account.userId, spaceId: account.spaceId },
    ]);
    expect(await db.getPendingMutations(guest.userId, guest.spaceId)).toEqual([]);
  });

  it('preserves the furthest destination sync cursor when rehoming', async () => {
    const guest = { userId: 'guest-user', spaceId: 'guest-space', role: 'admin' };
    const account = { userId: 'user-2', spaceId: 'space-2', role: 'admin' };
    await db.syncCursors.bulkPut([
      { userId: guest.userId, spaceId: guest.spaceId, serverRevision: 3 },
      { userId: account.userId, spaceId: account.spaceId, serverRevision: 9 },
    ]);

    await db.rehomeContext({
      fromUserId: guest.userId,
      fromSpaceId: guest.spaceId,
      toUserId: account.userId,
      toSpaceId: account.spaceId,
    });

    expect(await db.getCursor(account.userId, account.spaceId)).toBe(9);
    expect(await db.getCursor(guest.userId, guest.spaceId)).toBe(0);
  });

  it('discards only the guest namespace', async () => {
    const guest = { userId: 'guest-user', spaceId: 'guest-space', role: 'admin' };
    const account = { userId: 'user-2', spaceId: 'space-2', role: 'admin' };
    await db.configureContext(guest);
    await db.addTransaction({ amount: 250, date: new Date(2026, 0, 2) });
    await db.configureContext(account);
    await db.addTransaction({ amount: 500, date: new Date(2026, 0, 3) });

    expect(await db.getContextSummary(guest.userId, guest.spaceId)).toMatchObject({
      transactions: 1,
      total: 1,
    });
    await db.discardContext(guest.userId, guest.spaceId);

    expect(await db.getContextSummary(guest.userId, guest.spaceId)).toMatchObject({ total: 0 });
    expect(await db.getContextSummary(account.userId, account.spaceId)).toMatchObject({
      transactions: 1,
      total: 1,
    });
    expect(await db.getContext()).toMatchObject(account);
  });

  it('enforces viewer and collaborator permissions', async () => {
    await db.configureContext({ ...owner, role: 'viewer' });
    await expect(db.addTransaction({ amount: 1 })).rejects.toThrow(
      'Your role cannot change this data.'
    );

    await db.configureContext({ ...owner, role: 'collaborator' });
    await expect(db.addCategory({ name: 'Food' })).rejects.toThrow(
      'Your role cannot change this data.'
    );
    await expect(db.addTransaction({ amount: 1 })).resolves.toBeTruthy();
  });

  it('filters and sorts transactions within the active space', async () => {
    await db.addTransaction({
      amount: 100,
      categoryId: 'food',
      shopId: 'shop',
      remarks: 'Lunch',
      date: new Date(2026, 0, 1),
    });
    await db.addTransaction({
      amount: 300,
      categoryId: 'food',
      shopId: 'shop',
      remarks: 'Dinner',
      date: new Date(2026, 0, 3),
    });
    await db.addTransaction({
      amount: 200,
      categoryId: 'other',
      shopId: 'other',
      remarks: 'Snack',
      date: new Date(2026, 0, 2),
    });

    const transactions = await db.getPaginatedTransactions(2, '', {
      categoryId: 'food',
      shopId: 'shop',
      amountRange: [50, 400],
      dateRange: [new Date(2026, 0, 1), new Date(2026, 0, 4)],
    });
    expect(transactions.map(item => item.amount)).toEqual([300, 100]);
    expect(await db.getRecentTransactions(1)).toMatchObject([{ amount: 300 }]);
    expect(await db.getTransactionCountByCategory('food')).toBe(2);
  });

  it('updates and soft-deletes records locally', async () => {
    const id = await db.addTransaction({ amount: 10, date: new Date() });
    await db.updateTransaction(id, { amount: 20, date: new Date() });
    await db.deleteTransaction(id);

    expect(await db.getAllTransactions()).toEqual([]);
    expect(await db.transactions.get(id)).toMatchObject({
      deletedAt: expect.any(Date),
      syncState: 'pending',
    });
    expect(await db.getPendingMutations(owner.userId, owner.spaceId)).toHaveLength(3);
  });

  it('seeds categories once and maps parent relationships', async () => {
    await db.seedCategories([
      { id: 'parent', name: 'Parent', type: 'Expense', parentId: null },
      { id: 'child', name: 'Child', type: 'Expense', parentId: 'parent' },
    ]);
    await db.seedCategories([{ id: 'ignored', name: 'Ignored', type: 'Expense', parentId: null }]);

    const categories = await db.getAllCategories();
    expect(categories).toHaveLength(2);
    expect(categories.find(category => category.name === 'Child').parentId).toBe(
      categories.find(category => category.name === 'Parent').id
    );
  });

  it('applies remote rows and preserves pending local changes', async () => {
    await db.applyRemoteRows(owner.userId, owner.spaceId, [
      {
        id: 'remote-transaction',
        entity_type: 'transaction',
        payload: { amount: 50, date: new Date(2026, 0, 1) },
        version: 1,
        server_revision: 3,
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ]);
    await db.addTransaction({ id: 'local-transaction', amount: 10, date: new Date() });
    await db.applyRemoteRows(owner.userId, owner.spaceId, [
      {
        id: 'local-transaction',
        entity_type: 'transaction',
        payload: { amount: 99, date: new Date(2026, 0, 1) },
        version: 1,
        server_revision: 4,
        updated_at: '2026-01-01T00:00:00.000Z',
        deleted_at: null,
      },
    ]);

    expect(await db.transactions.get('remote-transaction')).toMatchObject({
      amount: 50,
      syncState: 'synced',
    });
    expect(await db.transactions.get('local-transaction')).toMatchObject({
      amount: 10,
      syncState: 'pending',
    });
    expect(await db.getCursor(owner.userId, owner.spaceId)).toBe(3);
  });

  it('marks successful mutations synced and records conflicts', async () => {
    const id = await db.addTransaction({ amount: 50, date: new Date() });
    const [mutation] = await db.getPendingMutations(owner.userId, owner.spaceId);
    await db.markMutationsSynced([{ id, version: 2, server_revision: 5 }], [mutation.mutationId]);
    expect(await db.getPendingMutations(owner.userId, owner.spaceId)).toEqual([]);
    expect(await db.transactions.get(id)).toMatchObject({ syncState: 'synced', serverVersion: 2 });

    const nextId = await db.addTransaction({ amount: 60, date: new Date() });
    const [nextMutation] = await db.getPendingMutations(owner.userId, owner.spaceId);
    await db.saveConflict(nextMutation, { id: nextId }, { amount: 60 });
    expect(await db.getConflicts(owner.userId, owner.spaceId)).toHaveLength(1);
    expect(await db.transactions.get(nextId)).toMatchObject({ syncState: 'conflict' });
  });
});
