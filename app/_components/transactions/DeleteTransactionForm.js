import { db } from "@lib/db";
import Button from "../common/Button";
import { toast } from "react-toastify";

export default function DeleteTransactionForm({ transactionId, onDelete, onCancel }) {
    const handleDeleteTransaction = () => {
        db.deleteTransaction(transactionId);
        toast.success('Transaction deleted');
        onDelete && onDelete();
    }

    return(
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">Delete Transaction</div>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">Are you sure you want to delete this transaction?</p>
            </div>
            <div className="flex justify-end gap-2.5">
                <Button label={"Cancel"} contained onClick={onCancel}/>
                <Button label={"Delete"} style="danger" contained onClick={handleDeleteTransaction}/>
            </div>
        </div>
    )
}