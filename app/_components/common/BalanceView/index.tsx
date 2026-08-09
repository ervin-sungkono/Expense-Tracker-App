'use client';
import { db } from '@lib/db';
import { useLocalStorage } from '@lib/hooks';
import { formatCurrency, generateAsterisks } from '@lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { IoMdEye as ShowIcon, IoMdEyeOff as HideIcon } from 'react-icons/io';
import { IoWallet as WalletIcon } from 'react-icons/io5';
import LoadingSpinner from '../LoadingSpinner';

export function BalanceDisplay({ balance, loading = false }) {
  const [hideBalance, setHideBalance] = useLocalStorage('hideBalance', false);
  const toggleBalanceVisibility = () => setHideBalance(prevState => !prevState);
  if (loading) {
    return (
      <div className="h-7 flex items-center grow">
        <LoadingSpinner color={'#FFFFFF'} size="small" />
      </div>
    );
  }
  const displayBalance = formatCurrency(balance ?? 0);
  return (
    <div className="flex items-center grow text-white">
      <div className="mr-2">
        <WalletIcon size={20} />
      </div>
      <div className="text-lg font-semibold">
        {hideBalance ? generateAsterisks(displayBalance.length) : displayBalance}
      </div>
      <div onClick={toggleBalanceVisibility} className="cursor-pointer ml-1 p-1.5">
        {hideBalance ? <ShowIcon size={20} /> : <HideIcon size={20} />}
      </div>
    </div>
  );
}

export default function BalanceView() {
  const [balance, setBalance] = useState(null);
  const transactions = useLiveQuery(() => db.getAllTransactions());

  useEffect(() => {
    if (transactions) {
      const currBalance = transactions.reduce((sum, transaction) => {
        if (transaction.type === 'Income') {
          return (sum += transaction.amount);
        }
        if (transaction.type === 'Expense') {
          return (sum -= transaction.amount);
        }
      }, 0);

      setBalance(currBalance);
    }
  }, [transactions]);

  return <BalanceDisplay balance={balance} loading={balance === null} />;
}
