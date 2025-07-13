'use client'
import dynamic from "next/dynamic";
import { db } from "@lib/db";
import Button from "../common/Button";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Dialog from "../common/Dialog";
import { toast } from "react-toastify";
const MergeCategoryForm = dynamic(() => import("./MergeCategoryForm"));

export default function DeleteCategoryForm({ categoryId, categoryName, onDelete }) {
    const transactionCount = useLiveQuery(() => db.getTransactionCountByCategory(categoryId));
    const childCategoryCount = useLiveQuery(() => db.getChildCategoriesCount(categoryId));
    const [showMerge, setShowMerge] = useState(false);

    const handleDeleteCategory = () => {
        db.deleteCategory(categoryId);
        toast.success('Category deleted');
        onDelete && onDelete();
    }

    const handleMergeCategory = (newParentId) => {
        setShowMerge(false);

        db.mergeCategory(categoryId, newParentId);
        onDelete && onDelete();
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
                <Button label={"Merge"} contained onClick={() => setShowMerge(true)}/>
                <Button label={"Delete"} style="danger" contained onClick={handleDeleteCategory}/>
            </div>
            <Dialog
                show={showMerge}
                hideFn={() => setShowMerge(false)}
            >
                <MergeCategoryForm 
                    categoryId={categoryId}
                    onMergeCategory={handleMergeCategory}
                />
            </Dialog>
        </div>
    )
}