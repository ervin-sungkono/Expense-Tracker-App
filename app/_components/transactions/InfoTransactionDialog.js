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

    const contents = [
        {
            label: "Date",
            value: formatDateString(transaction.date)
        },
        {
            label: "Amount",
            value: formatCurrency(transaction.amount)
        },
        {
            label: "Category",
            value: transaction.category
        },
        {
            label: "Shop",
            value: transaction.shop,
            isHidden: transaction.shop == null
        },
        {
            label: "Owner",
            value: transaction.owner,
            isHidden: transaction.owenr == null
        },
        {
            label: "Notes",
            value: transaction.remarks ?? "No notes yet."
        },
    ]

    return (
        <>
            <Dialog 
                show={show} 
                hideFn={hideFn}
            >
                <div className="flex flex-col gap-4">
                    <div className="text-xl font-bold">Transaction Detail</div>
                    <div className="flex flex-col mb-4">
                        {contents.map(content => (
                            !content.isHidden && <div key={content.label} className="flex flex-col gap-1 pb-2 not-last:border-b border-dark/20 dark:border-white/20">
                                <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">{content.label}</p>
                                <p className="text-sm md:text-base text-dark dark:text-white">{content.value}</p>
                            </div>
                        ))}
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