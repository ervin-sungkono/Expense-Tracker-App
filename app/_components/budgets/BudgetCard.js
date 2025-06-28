'use client'
import { db } from "@/app/_lib/db";
import { formatCurrency, getDayDifference } from "@/app/_lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { memo, useEffect, useState } from "react"
import LoadingSpinner from "../common/LoadingSpinner";
import BudgetProgress from "./BudgetProgress";

function BudgetCard({ budget, onClick, style }) {
    const { amount, categoryId, start_date, end_date } = budget;
    const [totalTransaction, setTotalTransaction] = useState(0);

    const remainingBudget = amount - totalTransaction;
    const todayDate = new Date();
    const daysSinceStart = getDayDifference(start_date, new Date());
    const totalDays = getDayDifference(start_date, end_date);
    const remainingDays = Math.max(0, Math.min(getDayDifference(todayDate, end_date), totalDays));

    const category = useLiveQuery(() => db.getCategoryById(categoryId));
    const transactions = useLiveQuery(() => db.getTransactionsRange(start_date, end_date, categoryId));

    useEffect(() => {
        if(transactions && transactions.length > 0) {
            const sum = transactions.reduce((acc, transaction) => {
                return acc += transaction.amount;
            }, 0);

            setTotalTransaction(sum);
        }
    }, [transactions]);

    const handleBudgetClicked = () => {
        onClick && onClick({ 
            ...budget, 
            totalTransaction, 
            remainingBudget, 
            remainingDays, 
            category 
        });
    }

    if(!transactions || !category) {
        return (
            <div style={style} className="pb-3">
                <div className="flex justify-center items-center w-full h-full rounded-lg bg-light dark:bg-neutral-800">
                    <LoadingSpinner size="medium"/>
                </div>
            </div>
        )
    }
    return (
        <div style={style} className="pb-3">
            <div onClick={handleBudgetClicked} className="cursor-pointer flex gap-2 md:gap-4 px-4 py-4 rounded-lg bg-light dark:bg-neutral-800 active:scale-95 transition-transform duration-150 ease-in-out">
                <div className="relative w-8 h-8 md:w-10 md:h-10 flex shrink-0 justify-center items-center bg-ocean-blue rounded-full">
                    <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${category.icon}`} alt="" fill/>
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
        </div>
    )
}

export default memo(BudgetCard);