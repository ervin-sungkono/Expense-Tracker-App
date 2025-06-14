'use client'
import { db } from "@/app/_lib/db"
import { useLocalStorage } from "@/app/_lib/hooks";
import { formatCurrency, generateAsterisks } from "@/app/_lib/utils";
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useState } from "react";
import { IoMdEye as ShowIcon, IoMdEyeOff as HideIcon } from "react-icons/io";
import { IoWallet as WalletIcon } from "react-icons/io5";
import LoadingSpinner from "./LoadingSpinner";

export default function BalanceView() {
    const [balance, setBalance] = useState(null);
    const [hideBalance, setHideBalance] = useLocalStorage('hideBalance', false);
    const transactions = useLiveQuery(() => db.getAllTransactions());

    const toggleBalanceVisibility = () => setHideBalance((prevState) => !prevState);

    useEffect(() => {
        if(transactions) {
            const currBalance = transactions.reduce((sum, transaction) => {
                if(transaction.type === 'Income') {
                    return sum += transaction.amount;
                }
                if(transaction.type === 'Expense') {
                    return sum -= transaction.amount;
                }
            }, 0);

            setBalance(formatCurrency(currBalance));
        }
    }, [transactions]);

    if(!balance) {
        return (
            <div className="h-7 flex items-center grow">
                <LoadingSpinner color={'#FFFFFF'} size="small"/>
            </div>
        )
    }  
    return(
        <div className="flex items-center grow text-white">
            <div className="mr-2">
                <WalletIcon size={20}/>
            </div>
            <div className="text-lg font-semibold">
                {hideBalance ? generateAsterisks(balance.length) : balance}
            </div>
            <div onClick={toggleBalanceVisibility} className="ml-1 p-1.5">
                {hideBalance ? <ShowIcon size={20}/> : <HideIcon size={20}/>}
            </div>
        </div>
    )
}