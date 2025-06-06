'use client'
import { useState } from "react";
import Dialog from "../Dialog";
import AddTransactionForm from "../../transactions/AddTransactionForm";

export default function AddTransactionButton({ item }) {
    const [showDialog, setShowDialog] = useState(false);

    if (!item) return
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