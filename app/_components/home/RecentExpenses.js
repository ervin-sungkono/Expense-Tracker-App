'use client'
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";
import SubHeader from "./SubHeader";
import RecentExpenseCard from "./RecentExpenseCard";
import { useEffect, useState } from "react";

export default function RecentExpenses() {
    const [expenseData, setExpenseData] = useState(null);
    const recentExpenses = useLiveQuery(() => db.getRecentExpenses(5));
    const categories = useLiveQuery(() => db.getAllCategories());

    useEffect(() => {
        if(recentExpenses && categories) {
            const categoriesMap = {};
            for(let i = 0; i < categories.length; i++) {
                categoriesMap[categories[i].id] = categories[i].name;
            }

            setExpenseData(recentExpenses.map(expense => ({ ...expense, category: categoriesMap[expense.categoryId]})));
        }
    }, [recentExpenses, categories])

    if(!expenseData) {
        return (
            <div className="mb-4">
                <SubHeader title={"Recent Expenses"} linkLabel="See all" link={"/expensess"} loading/>
                <div className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg py-2 animate-pulse"></div>
            </div>
        )
    }
    return(
        <div className="mb-4">
            <SubHeader title={"Recent Expenses"} linkLabel="See all" link={"/expensess"}/>
            <div className="bg-neutral-200 dark:bg-neutral-700 rounded-lg py-2">
                {expenseData.length > 0 ? 
                expenseData.map(expense => (
                    <RecentExpenseCard key={expense.id} {...expense}/>
                )) :
                <div className="h-48 flex justify-center items-center bg-neutral-200 dark:bg-neutral-700 rounded-lg py-2">
                    <p className="text-center text-sm md:text-base text-dark/80 dark:text-white/80">No recent expenses found.</p>
                </div>}
            </div>
        </div>
    )
}