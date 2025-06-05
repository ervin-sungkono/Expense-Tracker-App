import { db } from "@/app/_lib/db";
import Button from "../common/Button";
import { useLiveQuery } from "dexie-react-hooks";

export default function DeleteCategoryForm({ categoryId, categoryName, onDelete, onMerge }) {
    const transactionCount = useLiveQuery(() => db.getTransactionCountByCategory(categoryId));
    const childCategoryCount = useLiveQuery(() => db.getChildCategoriesCount(categoryId));

    const handleDeleteCategory = () => {
        db.deleteCategory(categoryId);
        onDelete && onDelete();
    }

    const handleMergeCategory = () => {
        // TODO: add merge category function
        // db.mergeCategory()
        onMerge && onMerge();
    }

    const getDeleteMessage = () => {
        return `There are ${transactionCount} transactions and ${childCategoryCount} sub categories in this category `;
    }

    return(
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">Delete {categoryName} Category</div>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">{getDeleteMessage()}</p>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">1. <b>Merge:</b> Move all transactions, budgets and sub categories to another category before deleting</p>
                <p className="text-dark/80 dark:text-white/80 text-sm md:text-base">2. <b>Delete:</b> Delete all transactions, budgets and sub categories along with this category</p>
            </div>
            <div className="flex justify-end gap-2.5">
                <Button label={"Merge"} contained onClick={handleMergeCategory}/>
                <Button label={"Delete"} style="danger" contained onClick={handleDeleteCategory}/>
            </div>
        </div>
    )
}