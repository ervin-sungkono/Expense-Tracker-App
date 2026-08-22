import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@lib/db';
import { parseAssistantRequest } from '@lib/assistant/protocol';
import {
  executeLocalAssistantTool,
  previewLocalAssistantTool,
} from '@lib/assistant/tools';
import { assistantExpenseTools, expenseToolCatalog } from '@lib/mcp/tool-catalog';

const context = { userId: crypto.randomUUID(), spaceId: crypto.randomUUID(), role: 'admin' };

describe('local assistant', () => {
  beforeEach(async () => {
    await db.resetDB();
    await db.configureContext(context);
  });

  it('derives its tools from the shared MCP catalog', () => {
    expect(assistantExpenseTools.map(tool => tool.name)).toEqual(
      expenseToolCatalog.filter(tool => tool.assistant).map(tool => tool.name)
    );
    expect(assistantExpenseTools.map(tool => tool.name)).not.toContain(
      'xpensed_create_transaction_from_email'
    );
  });

  it('validates bounded conversation requests', () => {
    expect(
      parseAssistantRequest({ history: [{ role: 'user', parts: [{ text: 'Show expenses' }] }] })
    ).toBeTruthy();
    expect(() => parseAssistantRequest({ history: [], message: '' })).toThrow(
      'Invalid assistant request'
    );
    expect(() =>
      parseAssistantRequest({ history: [], message: 'x'.repeat(8001) })
    ).toThrow('Invalid assistant request');
  });

  it('previews writes before queuing a scoped mutation', async () => {
    const categoryId = await db.addCategory({
      name: 'Meals',
      type: 'Expense',
      parentId: null,
      icon: 'sky--weather_star.svg',
    });
    const input = {
      amount: 50_000,
      currency: 'IDR',
      transaction_date: '2026-08-22',
      category_id: categoryId,
      merchant: 'Lunch',
    };

    await expect(
      previewLocalAssistantTool('xpensed_create_transaction', input, context.spaceId)
    ).resolves.toMatchObject({ requiresConfirmation: true });
    expect(await db.getAllTransactions()).toEqual([]);

    await executeLocalAssistantTool('xpensed_create_transaction', input, context.spaceId);
    expect(await db.getAllTransactions()).toMatchObject([
      { amount: 50_000, categoryId, userId: context.userId, spaceId: context.spaceId },
    ]);
  });

  it('cannot read a cached record from another space', async () => {
    const other = { ...context, spaceId: crypto.randomUUID() };
    await db.configureContext(other);
    const transactionId = await db.addTransaction({
      amount: 10_000,
      type: 'Expense',
      categoryId: crypto.randomUUID(),
      date: new Date('2026-08-22'),
    });
    await db.configureContext(context);

    await expect(
      previewLocalAssistantTool(
        'xpensed_get_transaction',
        { transaction_id: transactionId },
        context.spaceId
      )
    ).rejects.toThrow('active space');
  });
});
