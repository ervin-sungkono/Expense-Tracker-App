'use client'
import { useState } from "react";
import AddExpenseDialog from "../../expenses/AddExpenseDialog";

export default function AddExpenseButton({ item }) {
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
            <AddExpenseDialog show={showDialog} hideFn={() => setShowDialog(false)}/>
        </div>
    )
}