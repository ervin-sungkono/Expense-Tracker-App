'use client'
import { useState } from "react";
import VirtualizedCategoryList from "../categories/VirtualizedCategoryList";
import Button from "./Button";
import Page from "./Page";
import AddCategoryDialog from "./dialog/AddCategoryDialog";

export default function CategoryList({ categories, show, hideFn }) {
    const [showDialog, setShowDialog] = useState(false);

    return(
        <Page
            title={"Category List"}
            show={show}
            hideFn={hideFn}
        >
            <div className="grow flex flex-col gap-2">
                <div className="grow">
                    <VirtualizedCategoryList
                        items={categories}
                    />
                </div>
                <div className="flex justify-center">
                    <Button label={"Add New Category"} onClick={() => setShowDialog(true)}/>
                </div>
                {showDialog &&
                <AddCategoryDialog
                    show={showDialog}
                    hideFn={() => setShowDialog(false)}
                />}
            </div>
        </Page>
    )
}