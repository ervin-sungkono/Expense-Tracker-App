'use client'
import { useState } from "react";
import AddTransactionDialog from "../../transactions/AddTransactionDialog";

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
            <AddTransactionDialog show={showDialog} hideFn={() => setShowDialog(false)}/>
        </div>
    )
}