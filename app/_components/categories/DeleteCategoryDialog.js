import { db } from "@/app/_lib/db";
import Dialog from "../common/Dialog";
import Button from "../common/Button";

export default function DeleteCategoryDialog({ categoryId, show, hideFn, onDelete }) {
    const handleDeleteCategory = () => {
        db.deleteCategory(categoryId);
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
                    <div className="text-xl font-bold">Delete Category</div>
                    <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">Are you sure you want to delete this category?</p>
                    <p className="text-dark/80 dark:text-white/80 text-sm md:text-base"><b>Note:</b> all expenses referencing this category will be <b>DELETED.</b></p>
                </div>
                <div className="flex justify-end gap-2.5">
                    <Button label={"Cancel"} contained onClick={hideFn}/>
                    <Button label={"Delete"} style="danger" contained onClick={handleDeleteCategory}/>
                </div>
            </div>
        </Dialog>
    )
}