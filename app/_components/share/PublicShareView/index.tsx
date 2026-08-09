'use client';

import { useEffect, useMemo, useState } from 'react';
import Header from '@components/common/Header';
import LoadingSpinner from '@components/common/LoadingSpinner';
import { BalanceDisplay } from '@components/common/BalanceView';
import TransactionChart from '@components/home/TransactionChart';
import TransactionGraph from '@components/home/TransactionGraph';
import TransactionCard from '@components/transactions/TransactionCard';
import BudgetCard from '@components/budgets/BudgetCard';
import { formatCurrency, getMonthlyLabels } from '@lib/utils';

function dateValue(value) {
  return value ? new Date(value) : null;
}

function inBudgetRange(transaction, budget) {
  const date = dateValue(transaction.date)?.getTime();
  const start = dateValue(budget.startDate ?? budget.start_date)?.getTime();
  const end = dateValue(budget.endDate ?? budget.end_date)?.getTime();
  return date != null && (!start || date >= start) && (!end || date <= end);
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export default function PublicShareView({ token }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public-shares/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('This shared link is unavailable.');
        return response.json();
      })
      .then(data => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) setError('This shared link is unavailable.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const prepared = useMemo(() => {
    if (!snapshot) return null;
    const categoriesById = new Map(
      snapshot.categories.map(category => [String(category.id), category])
    );
    const transactions = snapshot.transactions
      .map(transaction => ({
        ...transaction,
        date: new Date(transaction.date),
        category: categoriesById.get(String(transaction.categoryId)),
      }))
      .sort((left, right) => right.date.getTime() - left.date.getTime());
    const budgets = snapshot.budgets.map(budget => ({
      ...budget,
      start_date: dateValue(budget.startDate ?? budget.start_date),
      end_date: dateValue(budget.endDate ?? budget.end_date),
      category: categoriesById.get(String(budget.categoryId)),
    }));
    const balance = transactions.reduce(
      (total, transaction) =>
        total + (transaction.type === 'Income' ? transaction.amount : -transaction.amount),
      0
    );
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentTransactions = { Income: [], Expense: [] };
    const previousTransactions = { Income: [], Expense: [] };
    transactions.forEach(transaction => {
      if (!currentTransactions[transaction.type] && !previousTransactions[transaction.type]) return;
      if (monthKey(transaction.date) === monthKey(now)) {
        currentTransactions[transaction.type].push(transaction);
      } else if (monthKey(transaction.date) === monthKey(previousMonth)) {
        previousTransactions[transaction.type].push(transaction);
      }
    });
    const income = transactions
      .filter(transaction => transaction.type === 'Income')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const expense = transactions
      .filter(transaction => transaction.type === 'Expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    return {
      categories: snapshot.categories,
      transactions,
      budgets,
      balance,
      income,
      expense,
      currentTransactions,
      previousTransactions,
      currentLabels: getMonthlyLabels(now.getFullYear(), now.getMonth()),
      previousLabels: getMonthlyLabels(previousMonth.getFullYear(), previousMonth.getMonth()),
      monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }, [snapshot]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 text-center">
        <p className="text-base text-dark/80 dark:text-white/80">{error}</p>
      </main>
    );
  }
  if (!prepared) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="large" />
      </main>
    );
  }

  return (
    <div className="flex flex-col overflow-auto fixed top-0 left-0 bottom-0 right-0">
        <main
          className={`relative w-full h-full overflow-x-hidden overflow-y-auto max-w-3xl px-6 ${showActionBar ? 'pt-4' : 'pt-6'} ${showNavbar ? 'mb-22' : 'pb-8'} mx-auto`}
        >
          <div className="mb-6 rounded-lg bg-ocean-blue px-4 py-3">
            <BalanceDisplay balance={prepared.balance} />
          </div>
          <Header title={snapshot.space.name} />
          <p className="mb-6 text-sm text-dark/70 dark:text-white/70">Read-only shared space</p>

          <section className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-light px-4 py-3 dark:bg-neutral-800">
              <p className="text-xs text-dark/70 dark:text-white/70">Total income</p>
              <p className="mt-1 text-lg font-bold text-ocean-blue">
                {formatCurrency(prepared.income)}
              </p>
            </div>
            <div className="rounded-lg bg-light px-4 py-3 dark:bg-neutral-800">
              <p className="text-xs text-dark/70 dark:text-white/70">Total expense</p>
              <p className="mt-1 text-lg font-bold text-red-500">{formatCurrency(prepared.expense)}</p>
            </div>
          </section>

          <section className="mb-6 rounded-lg bg-light py-3 dark:bg-neutral-800">
            <h2 className="px-4 text-lg font-bold">Spending by category</h2>
            <TransactionChart
              transactionData={prepared.transactions}
              categories={prepared.categories}
            />
          </section>

          <section className="mb-6 rounded-lg bg-light py-3 dark:bg-neutral-800">
            <h2 className="px-4 text-lg font-bold">Monthly trend</h2>
            <p className="px-4 text-sm text-dark/70 dark:text-white/70">{prepared.monthLabel}</p>
            <TransactionGraph
              type="MONTHLY"
              transactionType="Expense"
              labels={prepared.currentLabels}
              historyLabels={prepared.previousLabels}
              transactionData={prepared.currentTransactions}
              historyTransactionData={prepared.previousTransactions}
              title="PUBLIC_SHARE"
              allowDownload={false}
            />
          </section>

          <section className="mb-6">
            <h2 className="mb-3 text-lg font-bold">Budgets</h2>
            {prepared.budgets.length ? (
              prepared.budgets.map(budget => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  category={budget.category}
                  transactions={prepared.transactions.filter(
                    transaction =>
                      String(transaction.categoryId) === String(budget.categoryId) &&
                      inBudgetRange(transaction, budget)
                  )}
                  readOnly
                />
              ))
            ) : (
              <p className="rounded-lg bg-light px-4 py-8 text-center text-sm text-dark/70 dark:bg-neutral-800 dark:text-white/70">
                No budgets have been set.
              </p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="mb-3 text-lg font-bold">Recent transactions</h2>
            <div className="rounded-lg bg-light py-1.5 dark:bg-neutral-800">
              {prepared.transactions.length ? (
                prepared.transactions
                  .slice(0, 25)
                  .map(transaction => (
                    <TransactionCard key={transaction.id} transaction={transaction} readOnly />
                  ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-dark/70 dark:text-white/70">
                  No transactions yet.
                </p>
              )}
            </div>
          </section>
        </main>
    </div>
  );
}
