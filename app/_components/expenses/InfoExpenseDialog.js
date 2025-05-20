'use client'
import { useState } from "react";
import AddExpenseDialog from "./AddExpenseDialog";
import DeleteExpenseDialog from "./DeleteExpenseDialog";
import Dialog from "../common/Dialog";
import Button from "../common/Button";
import { formatCurrency, formatDateString } from "@/app/_lib/utils";

export default function InfoExpenseDialog({ expense, show, hideFn }) {
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    return (
        <>
            <Dialog 
                show={show} 
                hideFn={hideFn}
            >
                <div className="flex flex-col gap-4">
                    <div className="text-xl font-bold">Expense Detail</div>
                    <div className="flex flex-col mb-4">
                        <div className="flex flex-col gap-1 pb-2 border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Date</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{formatDateString(expense.date)}</p>
                        </div>
                        <div className="flex flex-col gap-1 py-2 border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Amount</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{formatCurrency(expense.amount)}</p>
                        </div>
                        <div className="flex flex-col gap-1 py-2 not-last:border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Category</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{expense.category}</p>
                        </div>
                        {expense.shop &&
                        <div className="flex flex-col gap-1 py-2 not-last:border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Shop</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{expense.shop}</p>
                        </div>}
                        {expense.remarks && 
                        <div className="flex flex-col gap-1 py-2">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Notes</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{expense.remarks}</p>
                        </div>}
                    </div>
                    <div className="flex justify-end gap-2.5">
                        <Button label={"Edit"} contained onClick={() => setShowEdit(true)}/>
                        <Button label={"Delete"} style="danger" contained onClick={() => setShowDelete(true)}/>
                    </div>
                </div>
            </Dialog>
            <AddExpenseDialog 
                expense={expense} 
                show={showEdit} 
                hideFn={() => setShowEdit(false)}
            />
            <DeleteExpenseDialog 
                expenseId={expense.id} 
                show={showDelete} 
                hideFn={() => setShowDelete(false)}
                onDelete={hideFn}
            />
        </>
    )
}