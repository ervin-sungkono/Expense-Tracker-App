'use client'
import { formatCurrency, getDebtLoanType } from "@/app/_lib/utils";
import Dialog from "../common/Dialog";
import { db } from "@/app/_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function InfoCategoryDialog({ category = {}, show, hideFn }) {
    const [totalTransaction, setTotalTransaction] = useState(0);
    const transactionCount = useLiveQuery(() => db.getTransactionCountByCategory(category.id));
    const transactions = useLiveQuery(() => db.getTransactionsByCategory(category.id));
    const parentCategory = useLiveQuery(() => db.getCategoryById(category.parentId));

    useEffect(() => {
        if(transactions) {
            const total = transactions.reduce((sum, acc) => {
                return sum += Number(acc.amount);
            }, 0);

            setTotalTransaction(total);
        }
    }, [transactions])
   
    const contents = [
        {
            label: "Name",
            value: category.name
        },
        {
            label: "Type",
            value: category.type === 'DebtLoan' ? getDebtLoanType(category.name) : category.type
        },
        {
            label: "Transaction Count",
            value: transactionCount
        },
        {
            label: "Total Transaction",
            value: formatCurrency(totalTransaction)
        },
        {
            label: "Parent Category",
            value: parentCategory?.name ?? "No Parent Category"
        }
    ]
    
    return (
        <>
            <Dialog 
                show={show} 
                hideFn={hideFn}
            >
                <div className="flex flex-col gap-4">
                    <div className="text-xl text-center font-bold">Category Detail</div>
                    <div className="relative w-14 h-14 md:w-16 md:h-16 mx-auto rounded-full bg-ocean-blue mb-2">
                        {category.icon && <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${category.icon}`} alt="" fill/>}
                    </div>
                    <div className="flex flex-col gap-4">
                        {contents.map(content => (
                            <div key={content.label} className="flex flex-col gap-1 pb-2 not-last:border-b border-dark/20 dark:border-white/20">
                                <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">{content.label}</p>
                                <p className="text-sm md:text-base text-dark dark:text-white">{content.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>
        </>
    )
}