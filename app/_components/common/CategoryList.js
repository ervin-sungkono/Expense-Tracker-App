'use client'
import { useEffect, useRef, useState } from "react";
import VirtualizedCategoryList from "../categories/VirtualizedCategoryList";
import Button from "./Button";
import Page from "./Page";
import AddCategoryDialog from "../categories/AddCategoryDialog";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";

export default function CategoryList({ show, hideFn }) {
    const [showDialog, setShowDialog] = useState(false);
    const [categoryData, setCategoryData] = useState(null);
    const categories = useLiveQuery(() => db.getAllCategories());
    const categoryRef = useRef(null);

    useEffect(() => {
        if(categories) {
            const result = {}
            
            categories.forEach(category => {
                if(!category.parentId) {
                    result[category.id] = {
                        ...category,
                        data: result[category.id]?.data ?? []
                    }
                } else {
                    if(!result[category.parentId]) {
                        result[category.parentId] = {
                            data: [category]
                        }
                    } else {
                        result[category.parentId].data.push(category);
                    }
                }
            })

            setCategoryData(Object.values(result));
        }
    }, [categories])

    useEffect(() => {
        if(categoryData) {
            console.log('TRIGGER ITEM SIZE RECOMPUTE');
            categoryRef.current?.resetAfterIndex(0);
        }
    }, [categoryData])

    return(
        <Page
            title={"Category List"}
            show={show}
            hideFn={hideFn}
        >
            <div className="grow flex flex-col gap-2">
                <div className="grow">
                    <VirtualizedCategoryList
                        ref={categoryRef}
                        items={categoryData}
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