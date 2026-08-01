'use client'
import { useState } from "react";
import Dialog from "../Dialog";
import AddTransactionForm from "../../transactions/AddTransactionForm";
import { useSpace } from "../../providers/AppProvider";

export default function AddTransactionButton({ item }) {
    const [showDialog, setShowDialog] = useState(false);
    const { canWriteTransactions } = useSpace();

    if (!item || !canWriteTransactions) return null;
    return (
        <div 
            className={`nav-fab`}
            aria-label={item.label}
        >
            <div className="fab-wrapper">
                <button className="fab-button" onClick={() =>setShowDialog(true) }>
                    {item.icon}
                </button>
            </div>
            <Dialog
                show={showDialog} 
                hideFn={() => setShowDialog(false)}
            >
                <AddTransactionForm onSubmit={() => setShowDialog(false)}/>
            </Dialog>
        </div>
    )
}
