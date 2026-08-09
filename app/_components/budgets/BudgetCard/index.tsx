'use client';
import { db } from '@lib/db';
import { formatCurrency, getDayDifference } from '@lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import Image from 'next/image';
import { memo, useEffect, useState } from 'react';
import LoadingSpinner from '../../common/LoadingSpinner';
import BudgetProgress from '../BudgetProgress';
import Dialog from '../../common/Dialog';
import InfoBudgetContent from '../InfoBudgetContent';

function BudgetCard({
  budget,
  style,
  category: suppliedCategory,
  transactions: suppliedTransactions,
  readOnly = false,
}) {
  const { amount, categoryId, start_date, end_date } = budget;
  const [totalTransaction, setTotalTransaction] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const remainingBudget = amount - totalTransaction;
  const todayDate = new Date();
  const daysSinceStart = getDayDifference(start_date, new Date());
  const totalDays = getDayDifference(start_date, end_date);
  const remainingDays = Math.max(0, Math.min(getDayDifference(todayDate, end_date), totalDays));

  const localCategory = useLiveQuery(
    () => (suppliedCategory ? suppliedCategory : db.getCategoryById(categoryId)),
    [categoryId, suppliedCategory]
  );
  const localTransactions = useLiveQuery(
    () =>
      suppliedTransactions
        ? suppliedTransactions
        : db.getTransactionsRange(start_date, end_date, categoryId),
    [categoryId, start_date, end_date, suppliedTransactions]
  );
  const category = suppliedCategory ?? localCategory;
  const transactions = suppliedTransactions ?? localTransactions;

  useEffect(() => {
    setTotalTransaction(
      transactions?.reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0) ?? 0
    );
  }, [transactions]);

  if (!transactions || !category) {
    return (
      <div style={style} className="pb-3">
        <div className="flex justify-center items-center w-full h-full rounded-lg bg-light dark:bg-neutral-800">
          <LoadingSpinner size="medium" />
        </div>
      </div>
    );
  }
  return (
    <div style={style} className="pb-3">
      <div
        onClick={readOnly ? undefined : () => setShowInfo(true)}
        className={`${readOnly ? '' : 'cursor-pointer active:scale-95'} flex gap-2 md:gap-4 px-4 py-4 rounded-lg bg-light dark:bg-neutral-800 transition-transform duration-150 ease-in-out`}
      >
        <div className="relative w-8 h-8 md:w-10 md:h-10 flex shrink-0 justify-center items-center bg-ocean-blue rounded-full">
          {category.icon && (
            <Image
              className="object-contain p-1.5 md:p-2"
              src={`/category_icons/${category.icon}`}
              alt=""
              fill
            />
          )}
        </div>
        <div className="grow">
          <div className="flex items-center gap-2">
            <p className="text-base font-medium grow">{category.name}</p>
            <div className="text-base font-semibold">{formatCurrency(amount)}</div>
          </div>
          <BudgetProgress
            dateRange={[start_date, end_date]}
            daysSinceStart={daysSinceStart}
            remainingDays={remainingDays}
            remainingBudget={remainingBudget}
            budgetAmount={amount}
          />
        </div>
      </div>
      {!readOnly && (
        <Dialog show={showInfo} hideFn={() => setShowInfo(false)}>
          <InfoBudgetContent
            budget={{ ...budget, totalTransaction, remainingBudget, remainingDays, category }}
            hideFn={() => setShowInfo(false)}
          />
        </Dialog>
      )}
    </div>
  );
}

export default memo(BudgetCard);
