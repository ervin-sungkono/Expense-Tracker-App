import { getSupportedCurrencies } from '@lib/currency';
import { generateBudgets, generateTransactions, getCategories, getShops } from '@lib/seeder';

describe('currency and seed data', () => {
  it('returns the browser-supported currency list', () => {
    expect(getSupportedCurrencies()).toContain('IDR');
  });

  it('creates valid category and shop fixtures', () => {
    expect(getCategories()).toHaveLength(12);
    expect(getShops()).toHaveLength(2);
  });

  it('generates requested transactions and budgets', () => {
    const transactions = generateTransactions(3);
    const budgets = generateBudgets(2);
    expect(transactions).toHaveLength(3);
    expect(transactions.every(transaction => transaction.date instanceof Date)).toBe(true);
    expect(budgets).toHaveLength(2);
    expect(budgets.every(budget => budget.end_date >= budget.start_date)).toBe(true);
  });
});
