'use client'
import { db } from "@/app/_lib/db";
import { formatCurrency, formatDate, getDayDifference } from "@/app/_lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { memo, useEffect, useState } from "react"
import { IoChevronForward as RightIcon } from "react-icons/io5";
import LoadingSpinner from "../common/LoadingSpinner";

function BudgetCard({ budget, onClick, style }) {
    const { amount, categoryId, start_date, end_date } = budget;
    const [totalTransaction, setTotalTransaction] = useState(0);
    const remainingBudget = amount - totalTransaction;
    const todayDate = new Date();

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
        onClick && onClick({ budget, totalTransaction });
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
            <div onClick={handleBudgetClicked} className="cursor-pointer flex gap-2 md:gap-4 px-4 py-4 rounded-lg bg-light dark:bg-neutral-800">
                <div className="relative w-8 h-8 md:w-10 md:h-10 flex shrink-0 justify-center items-center bg-ocean-blue rounded-full">
                    <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${category.icon}`} alt="" fill/>
                </div>
                <div className="grow">
                    <div className="flex items-center gap-2">
                        <p className="text-base font-medium grow">{category.name}</p>
                        <div className="text-base font-semibold">{formatCurrency(amount)}</div>
                    </div>
                    <div className="flex flex-col mt-1">
                        <div className="flex justify-between mb-1.5 text-dark/80 dark:text-white/80">
                            <p className="text-sm">{formatDate(start_date)}</p>
                            <p className="text-sm">{formatDate(end_date)}</p>
                        </div>
                        <div className="relative w-full h-1.5 md:h-2 bg-neutral-700 rounded-full">
                            {remainingBudget < 0 ? 
                            <div className="absolute top-0 left-0 h-full bg-danger-gradient rounded-full" style={{ width: '100%' }}></div> :
                            <div className="absolute top-0 left-0 h-full bg-basic-gradient rounded-full" style={{ width: `${remainingBudget / amount * 100}%` }}></div>}
                        </div>
                        <div className="flex justify-between mt-2 font-medium">
                            <p className="text-sm">{Math.max(getDayDifference(todayDate, end_date), 0)} days left</p>
                            {remainingBudget < 0 ? 
                            <p className="flex flex-col items-end gap-0.5 text-sm">
                                <span className="text-xs text-dark/60 dark:text-white/60">Overspent</span> 
                                <span>{formatCurrency(remainingBudget * -1)}</span>
                            </p> :
                            <p className="flex flex-col items-end gap-0.5 text-sm">
                                <span className="text-xs text-dark/60 dark:text-white/60">Remaining</span>
                                <span>{formatCurrency(remainingBudget)}</span>
                            </p>}
                        </div>
                    </div>
                </div> 
            </div>
        </div>
    )
}

export default memo(BudgetCard);