'use client'
import { useEffect, useRef, useState } from "react";
import VirtualizedCategoryList from "../categories/VirtualizedCategoryList";
import Button from "./Button";
import Page from "./Page";
import CategoryTab from "../categories/CategoryTab";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/app/_lib/db";
import dynamic from "next/dynamic";
import Dialog from "./Dialog";

const AddCategoryForm = dynamic(() => import("../categories/AddCategoryForm"))

export default function CategoryList({ show, hideFn }) {
    const [showDialog, setShowDialog] = useState(false);
    const [categoryData, setCategoryData] = useState(null);
    const [selectedType, setSelectedType] = useState('Expense');
    const categories = useLiveQuery(() => db.getAllCategories());
    const categoryRef = useRef(null);

    useEffect(() => {
        if(categories) {
            const result = {
                'Expense': {},
                'Income': {},
                'DebtLoan': {}
            }
            
            categories.forEach(category => {
                if(!category.parentId) {
                    result[category.type][category.id] = {
                        ...category,
                        data: result[category.type][category.id]?.data ?? []
                    }
                } else {
                    if(!result[category.type][category.parentId]) {
                        result[category.type][category.parentId] = {
                            data: [category]
                        }
                    } else {
                        result[category.type][category.parentId].data.push(category);
                    }
                }
            })
            
            const types = Object.keys(result);
            types.forEach(type => {
                result[type] = Object.values(result[type]);
            })

            setCategoryData(result);
        }
    }, [categories])

    useEffect(() => {
        if(categoryData && categoryData[selectedType]) {
            console.log('TRIGGER ITEM SIZE RECOMPUTE');
            categoryRef.current?.resetAfterIndex(0);
        }
    }, [categoryData, selectedType])

    return(
        <Page
            title={"Category List"}
            show={show}
            hideFn={hideFn}
        >
            <div className="grow flex flex-col">
                <CategoryTab selected={selectedType} onChange={(type) => setSelectedType(type)}/>
                <div className="grow">
                    <VirtualizedCategoryList
                        ref={categoryRef}
                        items={categoryData?.[selectedType]}
                    />
                </div>
                <div className="flex justify-center mt-2">
                    <Button label={"Add New Category"} onClick={() => setShowDialog(true)}/>
                </div>
                <Dialog
                    show={showDialog}
                    hideFn={() => setShowDialog(false)}
                >
                    <AddCategoryForm onSubmit={() => setShowDialog(false)}/>
                </Dialog>
            </div>
        </Page>
    )
}