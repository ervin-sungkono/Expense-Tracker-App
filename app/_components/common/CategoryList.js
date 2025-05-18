'use client'
import { useState } from "react";
import VirtualizedCategoryList from "../categories/VirtualizedCategoryList";
import Button from "./Button";
import Page from "./Page";
import AddCategoryDialog from "./dialog/AddCategoryDialog";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";

export default function CategoryList({ show, hideFn }) {
    const [showDialog, setShowDialog] = useState(false);
    const categories = useLiveQuery(() => db.getAllCategories());

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
                <AddCategoryDialog
                    show={showDialog}
                    hideFn={() => setShowDialog(false)}
                />
            </div>
        </Page>
    )
}