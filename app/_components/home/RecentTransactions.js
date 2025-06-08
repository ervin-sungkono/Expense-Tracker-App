'use client'
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";
import SubHeader from "./SubHeader";
import TransactionCard from "../transactions/TransactionCard";
import { useEffect, useState } from "react";

export default function RecentTransactions() {
    const [transactionData, setTransactionData] = useState(null);
    const recentTransactions = useLiveQuery(() => db.getRecentTransactions(5));
    const categories = useLiveQuery(() => db.getAllCategories());

    useEffect(() => {
        if(recentTransactions && categories) {
            const categoriesMap = {};
            for(let i = 0; i < categories.length; i++) {
                categoriesMap[categories[i].id] = categories[i];
            }

            setTransactionData(recentTransactions.map(transaction => ({ ...transaction, category: categoriesMap[transaction.categoryId]})));
        }
    }, [recentTransactions, categories])

    if(!transactionData) {
        return (
            <div className="mb-4">
                <SubHeader title={"Recent Transactions"} linkLabel="See all" link={"/transactions"} loading/>
                <div className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg py-1.5 animate-pulse"></div>
            </div>
        )
    }
    return(
        <div className="mb-4">
            <SubHeader title={"Recent Transactions"} linkLabel="See all" link={"/transactions"}/>
            <div className="bg-neutral-200 dark:bg-neutral-700 rounded-lg py-1.5">
                {transactionData.length > 0 ? 
                transactionData.map(transaction => (
                    <TransactionCard key={transaction.id} transaction={transaction}/>
                )) :
                <div className="h-48 flex justify-center items-center bg-neutral-200 dark:bg-neutral-700 rounded-lg py-2">
                    <p className="text-center text-sm md:text-base text-dark/80 dark:text-white/80">No recent transactions found.</p>
                </div>}
            </div>
        </div>
    )
}