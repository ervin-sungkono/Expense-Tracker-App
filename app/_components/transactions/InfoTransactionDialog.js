'use client'
import { useState } from "react";
import AddTransactionDialog from "./AddTransactionDialog";
import DeleteTransactionDialog from "./DeleteTransactionDialog";
import Dialog from "../common/Dialog";
import Button from "../common/Button";
import { formatCurrency, formatDateString } from "@/app/_lib/utils";

export default function InfoTransactionDialog({ transaction, show, hideFn }) {
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    return (
        <>
            <Dialog 
                show={show} 
                hideFn={hideFn}
            >
                <div className="flex flex-col gap-4">
                    <div className="text-xl font-bold">Transaction Detail</div>
                    <div className="flex flex-col mb-4">
                        <div className="flex flex-col gap-1 pb-2 border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Date</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{formatDateString(transaction.date)}</p>
                        </div>
                        <div className="flex flex-col gap-1 py-2 border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Amount</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{formatCurrency(transaction.amount)}</p>
                        </div>
                        <div className="flex flex-col gap-1 py-2 not-last:border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Category</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{transaction.category}</p>
                        </div>
                        {transaction.shop &&
                        <div className="flex flex-col gap-1 py-2 not-last:border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Shop</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{transaction.shop}</p>
                        </div>}
                        {transaction.remarks && 
                        <div className="flex flex-col gap-1 py-2">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">Notes</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{transaction.remarks}</p>
                        </div>}
                    </div>
                    <div className="flex justify-end gap-2.5">
                        <Button label={"Edit"} contained onClick={() => setShowEdit(true)}/>
                        <Button label={"Delete"} style="danger" contained onClick={() => setShowDelete(true)}/>
                    </div>
                </div>
            </Dialog>
            <AddTransactionDialog 
                transaction={transaction} 
                show={showEdit} 
                hideFn={() => setShowEdit(false)}
            />
            <DeleteTransactionDialog 
                transactionId={transaction.id} 
                show={showDelete} 
                hideFn={() => setShowDelete(false)}
                onDelete={hideFn}
            />
        </>
    )
}