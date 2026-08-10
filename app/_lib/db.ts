import Dexie from 'dexie';
import { isInAmountRange, isInDateRange } from './utils';

const DB_NAME = 'XpensedLocal';
const DB_VERSION = 2;

function uuid() {
  return globalThis.crypto.randomUUID();
}

function now() {
  return new Date();
}

function withoutSyncFields(record) {
  const {
    userId,
    spaceId,
    serverVersion,
    serverRevision,
    syncState,
    localUpdatedAt,
    deletedAt,
    ...payload
  } = record;
  return payload;
}

class ExpenseDB extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      context: '&id, userId, spaceId',
      transactions:
        '&id, userId, spaceId, date, categoryId, shopId, [userId+spaceId], [userId+spaceId+date], [userId+spaceId+categoryId]',
      categories:
        '&id, userId, spaceId, name, type, parentId, [userId+spaceId], [userId+spaceId+parentId]',
      budgets: '&id, userId, spaceId, start_date, end_date, categoryId, [userId+spaceId]',
      shops: '&id, userId, spaceId, name, [userId+spaceId]',
      outbox:
        '&mutationId, groupId, userId, spaceId, entityType, entityId, state, createdAt, [userId+spaceId+state]',
      conflicts: '&id, userId, spaceId, entityType, entityId, createdAt, [userId+spaceId]',
      syncCursors: '[userId+spaceId], userId, spaceId',
    });
  }

  async configureContext({ userId, spaceId, role }) {
    if (!userId || !spaceId) {
      await this.context.delete('active');
      return;
    }
    await this.context.put({ id: 'active', userId, spaceId, role });
  }

  async rehomeContext({ fromUserId, fromSpaceId, toUserId, toSpaceId }) {
    if (!fromUserId || !fromSpaceId || !toUserId || !toSpaceId) {
      throw new Error('All source and destination context identifiers are required.');
    }
    if (fromUserId === toUserId && fromSpaceId === toSpaceId) return;

    await this.transaction(
      'rw',
      this.context,
      this.transactions,
      this.categories,
      this.budgets,
      this.shops,
      this.outbox,
      this.conflicts,
      this.syncCursors,
      async () => {
        const tables = [
          this.transactions,
          this.categories,
          this.budgets,
          this.shops,
          this.outbox,
          this.conflicts,
        ];
        for (const table of tables) {
          const rows = await table
            .where('[userId+spaceId]')
            .equals([fromUserId, fromSpaceId])
            .toArray();
          if (rows.length) {
            await table.bulkPut(
              rows.map(row => ({ ...row, userId: toUserId, spaceId: toSpaceId }))
            );
          }
        }

        const sourceCursor = await this.syncCursors.get([fromUserId, fromSpaceId]);
        const destinationCursor = await this.syncCursors.get([toUserId, toSpaceId]);
        if (sourceCursor || destinationCursor) {
          await this.syncCursors.delete([fromUserId, fromSpaceId]);
          await this.syncCursors.put({
            userId: toUserId,
            spaceId: toSpaceId,
            serverRevision: Math.max(
              sourceCursor?.serverRevision ?? 0,
              destinationCursor?.serverRevision ?? 0
            ),
          });
        }

        await this.context.put({ id: 'active', userId: toUserId, spaceId: toSpaceId, role: 'admin' });
      }
    );
  }

  async getContextSummary(userId, spaceId) {
    const tables = [this.transactions, this.categories, this.budgets, this.shops];
    const counts = await Promise.all(
      tables.map(table => table.where('[userId+spaceId]').equals([userId, spaceId]).count())
    );
    return {
      transactions: counts[0],
      categories: counts[1],
      budgets: counts[2],
      shops: counts[3],
      total: counts.reduce((sum, count) => sum + count, 0),
    };
  }

  async discardContext(userId, spaceId) {
    const tables = [
      this.transactions,
      this.categories,
      this.budgets,
      this.shops,
      this.outbox,
      this.conflicts,
    ];
    await this.transaction('rw', ...tables, this.syncCursors, this.context, async () => {
      for (const table of tables) {
        await table.where('[userId+spaceId]').equals([userId, spaceId]).delete();
      }
      await this.syncCursors.delete([userId, spaceId]);
      const active = await this.context.get('active');
      if (active?.userId === userId && active?.spaceId === spaceId) await this.context.delete('active');
    });
  }

  getContext() {
    return this.context.get('active');
  }

  async _activeRows(table) {
    const context = await this.getContext();
    if (!context) return [];
    return table
      .where('[userId+spaceId]')
      .equals([context.userId, context.spaceId])
      .filter(row => !row.deletedAt)
      .toArray();
  }

  _decorate(context, payload, existing = {}) {
    return {
      ...existing,
      ...payload,
      id: existing.id ?? payload.id ?? uuid(),
      userId: context.userId,
      spaceId: context.spaceId,
      serverVersion: existing.serverVersion ?? 0,
      serverRevision: existing.serverRevision ?? 0,
      syncState: 'pending',
      localUpdatedAt: now(),
      deletedAt: null,
    };
  }

  async _queue(table, entityType, record, operation = 'upsert', groupId = uuid()) {
    const context = await this.getContext();
    if (!context) throw new Error('Select a space before changing data.');
    if (
      context.role === 'viewer' ||
      (context.role === 'collaborator' && entityType !== 'transaction')
    ) {
      throw new Error('Your role cannot change this data.');
    }
    const mutationId = uuid();
    const next =
      operation === 'delete'
        ? { ...record, syncState: 'pending', deletedAt: now(), localUpdatedAt: now() }
        : this._decorate(context, record, record.id ? await table.get(record.id) : {});

    await this.transaction('rw', table, this.outbox, async () => {
      await table.put(next);
      await this.outbox.add({
        mutationId,
        groupId,
        userId: context.userId,
        spaceId: context.spaceId,
        entityType,
        entityId: next.id,
        operation,
        baseVersion: next.serverVersion ?? 0,
        state: 'pending',
        createdAt: now(),
      });
    });
    return next.id;
  }

  getAllTransactions() {
    return this._activeRows(this.transactions);
  }

  async getMonthTransactions() {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1, 0);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return (await this.getAllTransactions()).filter(transaction =>
      isInDateRange(transaction.date, [firstDay, lastDay])
    );
  }

  async getTransactionsRange(startDate, endDate, categoryId) {
    const category = await this.getCategoryById(categoryId);
    const children = await this.getChildCategories(categoryId);
    if (!category) return [];
    const ids = new Set([category, ...children].map(item => item.id));
    return (await this.getAllTransactions()).filter(
      item => ids.has(item.categoryId) && isInDateRange(item.date, [startDate, endDate])
    );
  }

  async getTransactionsByCategory(categoryId) {
    return (await this.getAllTransactions()).filter(item => item.categoryId === categoryId);
  }

  async getPaginatedTransactions(
    limit,
    searchText,
    { categoryId, shopId, amountRange, dateRange }
  ) {
    return (await this.getAllTransactions())
      .filter(transaction => {
        if (!(transaction.remarks ?? '').toLowerCase().includes(searchText)) return false;
        if (categoryId && transaction.categoryId !== categoryId) return false;
        if (shopId && transaction.shopId !== shopId) return false;
        if (!isInAmountRange(transaction.amount, amountRange)) return false;
        if (!isInDateRange(transaction.date, dateRange)) return false;
        return true;
      })
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, limit);
  }

  async getRecentTransactions(limit) {
    return (await this.getAllTransactions())
      .sort((left, right) => new Date(right.date) - new Date(left.date))
      .slice(0, limit);
  }

  async getTransactionCountByCategory(categoryId) {
    return (await this.getTransactionsByCategory(categoryId)).length;
  }

  async getAllCategories() {
    return (await this._activeRows(this.categories)).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  async getCategoryById(categoryId) {
    if (!categoryId) return null;
    const row = await this.categories.get(categoryId);
    const context = await this.getContext();
    return row &&
      context &&
      row.userId === context.userId &&
      row.spaceId === context.spaceId &&
      !row.deletedAt
      ? row
      : null;
  }

  async getMergeCategories(categoryId) {
    const category = await this.getCategoryById(categoryId);
    if (!category) return [];
    return (await this.getAllCategories()).filter(
      candidate =>
        candidate.type === category.type &&
        candidate.id !== categoryId &&
        (category.parentId || candidate.parentId !== categoryId)
    );
  }

  async getParentCategories(type) {
    return (await this.getAllCategories()).filter(
      category => category.parentId == null && category.type === type
    );
  }

  async getChildCategories(categoryId) {
    return (await this.getAllCategories()).filter(category => category.parentId === categoryId);
  }

  async getChildCategoriesCount(categoryId) {
    return (await this.getChildCategories(categoryId)).length;
  }

  getAllShops() {
    return this._activeRows(this.shops);
  }

  async getPaginatedShops(limit, searchText) {
    return (await this.getAllShops())
      .filter(shop => shop.name.toLowerCase().includes(searchText))
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, limit);
  }

  async getAllBudgets(type) {
    const budgets = (await this._activeRows(this.budgets)).sort(
      (left, right) => new Date(right.start_date) - new Date(left.start_date)
    );
    if (!type) return budgets;
    const current = new Date();
    return budgets.filter(budget => {
      const active = isInDateRange(current, [budget.start_date, budget.end_date]);
      if (type === 'active') return active;
      if (type === 'finished') return !active && current > new Date(budget.end_date);
      if (type === 'upcoming') return !active && current < new Date(budget.start_date);
      return true;
    });
  }

  async getPaginatedBudgets(limit, type) {
    return (await this.getAllBudgets(type)).slice(0, limit);
  }

  addTransaction(payload) {
    return this._queue(this.transactions, 'transaction', payload);
  }
  updateTransaction(id, payload) {
    return this._queue(this.transactions, 'transaction', { ...payload, id });
  }
  addCategory(payload) {
    return this._queue(this.categories, 'category', payload);
  }
  updateCategory(id, payload) {
    return this._queue(this.categories, 'category', { ...payload, id });
  }
  addShop(payload) {
    return this._queue(this.shops, 'shop', payload);
  }
  updateShop(id, payload) {
    return this._queue(this.shops, 'shop', { ...payload, id });
  }
  addBudget(payload) {
    return this._queue(this.budgets, 'budget', payload);
  }
  updateBudget(id, payload) {
    return this._queue(this.budgets, 'budget', { ...payload, id });
  }

  async deleteTransaction(id) {
    const row = await this.transactions.get(id);
    if (row) return this._queue(this.transactions, 'transaction', row, 'delete');
  }

  async deleteBudget(id) {
    const row = await this.budgets.get(id);
    if (row) return this._queue(this.budgets, 'budget', row, 'delete');
  }

  async deleteShop(id) {
    const row = await this.shops.get(id);
    if (!row) return;
    const groupId = uuid();
    const transactions = (await this.getAllTransactions()).filter(item => item.shopId === id);
    for (const transaction of transactions)
      await this._queue(
        this.transactions,
        'transaction',
        { ...transaction, shopId: null },
        'upsert',
        groupId
      );
    return this._queue(this.shops, 'shop', row, 'delete', groupId);
  }

  async mergeCategory(id, newParentId) {
    const category = await this.getCategoryById(id);
    if (!category) return;
    const groupId = uuid();
    const replacement = await this.getCategoryById(newParentId);
    for (const transaction of (await this.getAllTransactions()).filter(
      item => item.categoryId === id
    )) {
      await this._queue(
        this.transactions,
        'transaction',
        { ...transaction, categoryId: newParentId },
        'upsert',
        groupId
      );
    }
    for (const budget of (await this.getAllBudgets()).filter(item => item.categoryId === id)) {
      await this._queue(
        this.budgets,
        'budget',
        { ...budget, categoryId: newParentId },
        'upsert',
        groupId
      );
    }
    for (const child of await this.getChildCategories(id)) {
      await this._queue(
        this.categories,
        'category',
        { ...child, parentId: replacement?.parentId ?? newParentId },
        'upsert',
        groupId
      );
    }
    return this._queue(this.categories, 'category', category, 'delete', groupId);
  }

  async deleteCategory(id) {
    const category = await this.getCategoryById(id);
    if (!category) return;
    const groupId = uuid();
    for (const transaction of (await this.getAllTransactions()).filter(
      item => item.categoryId === id
    )) {
      await this._queue(this.transactions, 'transaction', transaction, 'delete', groupId);
    }
    for (const budget of (await this.getAllBudgets()).filter(item => item.categoryId === id)) {
      await this._queue(this.budgets, 'budget', budget, 'delete', groupId);
    }
    for (const child of await this.getChildCategories(id))
      await this._queue(this.categories, 'category', child, 'delete', groupId);
    return this._queue(this.categories, 'category', category, 'delete', groupId);
  }

  updateRepeatableBudgets() {}

  async seedCategories(categories) {
    const context = await this.getContext();
    if (!context || (await this.getAllCategories()).length > 0) return;
    const idMap = new Map(categories.map(category => [category.id, uuid()]));
    for (const category of categories) {
      await this.addCategory({
        ...category,
        id: idMap.get(category.id),
        parentId: category.parentId == null ? null : (idMap.get(category.parentId) ?? null),
      });
    }
  }

  getPendingMutations(userId, spaceId) {
    return this.outbox
      .where('[userId+spaceId+state]')
      .equals([userId, spaceId, 'pending'])
      .sortBy('createdAt');
  }

  getEntityTable(entityType) {
    return {
      transaction: this.transactions,
      category: this.categories,
      shop: this.shops,
      budget: this.budgets,
    }[entityType];
  }

  async getMutationPayload(mutation) {
    const row = await this.getEntityTable(mutation.entityType).get(mutation.entityId);
    return row ? withoutSyncFields(row) : null;
  }

  async markMutationsSynced(results, mutationIds) {
    await this.transaction(
      'rw',
      this.outbox,
      this.transactions,
      this.categories,
      this.shops,
      this.budgets,
      async () => {
        for (const result of results) {
          for (const table of [this.transactions, this.categories, this.shops, this.budgets]) {
            const row = await table.get(result.id);
            if (row)
              await table.update(result.id, {
                serverVersion: result.version,
                serverRevision: result.server_revision,
                syncState: 'synced',
              });
          }
        }
        await this.outbox.bulkDelete(mutationIds);
      }
    );
  }

  async saveConflict(mutation, remote, local) {
    await this.conflicts.put({
      id: mutation.mutationId,
      userId: mutation.userId,
      spaceId: mutation.spaceId,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      mutation,
      local,
      remote,
      createdAt: now(),
    });
    await this.outbox.update(mutation.mutationId, { state: 'conflict' });
    await this.getEntityTable(mutation.entityType).update(mutation.entityId, {
      syncState: 'conflict',
    });
  }

  getConflicts(userId, spaceId) {
    return this.conflicts.where('[userId+spaceId]').equals([userId, spaceId]).toArray();
  }

  async getCursor(userId, spaceId) {
    return (await this.syncCursors.get([userId, spaceId]))?.serverRevision ?? 0;
  }

  async applyRemoteRows(userId, spaceId, rows) {
    let cursor = await this.getCursor(userId, spaceId);
    await this.transaction(
      'rw',
      this.transactions,
      this.categories,
      this.shops,
      this.budgets,
      this.outbox,
      this.syncCursors,
      async () => {
        for (const row of rows) {
          const table = this.getEntityTable(row.entity_type);
          const pending = await this.outbox
            .where('entityId')
            .equals(row.id)
            .filter(item => item.state === 'pending')
            .first();
          if (pending && row.version > pending.baseVersion) continue;
          if (row.deleted_at) await table.delete(row.id);
          else {
            await table.put({
              ...row.payload,
              id: row.id,
              userId,
              spaceId,
              serverVersion: row.version,
              serverRevision: row.server_revision,
              syncState: 'synced',
              localUpdatedAt: new Date(row.updated_at),
              deletedAt: null,
            });
          }
          cursor = Math.max(cursor, Number(row.server_revision));
        }
        await this.syncCursors.put({ userId, spaceId, serverRevision: cursor });
      }
    );
  }

  async importDB({
    file,
    clearTablesBeforeImport = false,
    overwriteValues = false,
    progressCallback,
  }) {
    if (typeof window !== 'undefined') await import('dexie-export-import');
    return this.import(file, { overwriteValues, clearTablesBeforeImport, progressCallback });
  }

  async exportDB({ progressCallback }) {
    if (typeof window !== 'undefined') await import('dexie-export-import');
    return this.export({ progressCallback });
  }

  async resetDB() {
    await Promise.all([
      this.transactions.clear(),
      this.categories.clear(),
      this.budgets.clear(),
      this.shops.clear(),
      this.outbox.clear(),
      this.conflicts.clear(),
      this.syncCursors.clear(),
      this.context.clear(),
    ]);
  }
}

export const db = new ExpenseDB();
