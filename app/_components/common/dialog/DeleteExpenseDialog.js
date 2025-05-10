import { db } from "@/app/_lib/db";
import Dialog from "./Dialog";
import Button from "../Button";

export default function DeleteExpenseDialog({ expenseId, show, hideFn, onDelete }) {
    const handleDeleteExpense = () => {
        db.deleteExpense(expenseId);
        onDelete && onDelete();
        hideFn && hideFn();
    }

    return(
        <Dialog
            show={show}
            hideFn={hideFn}
            hideCancelButton
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <div className="text-xl font-bold">Delete Expense</div>
                    <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">Are you sure you want to delete this expense?</p>
                </div>
                <div className="flex justify-end gap-2.5">
                    <Button label={"Cancel"} contained onClick={hideFn}/>
                    <Button label={"Delete"} style="danger" contained onClick={handleDeleteExpense}/>
                </div>
            </div>
        </Dialog>
    )
}