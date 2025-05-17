'use client'
import VirtualizedCategoryList from "../../categories/VirtualizedCategoryList";
import Dialog from "./Dialog";

export default function CategoryListDialog({ categories = [], show, hideFn }) {
    return(
        <Dialog
            show={show}
            hideFn={hideFn}
        >
            <div className="flex flex-col gap-4">
                <div className="text-xl font-bold">Category List</div>
                <div className="h-[60vh]">
                    <VirtualizedCategoryList
                        items={categories}
                    />
                </div>
            </div>
        </Dialog>
    )
}