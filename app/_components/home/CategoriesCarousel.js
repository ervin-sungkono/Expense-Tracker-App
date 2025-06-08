'use client'
import dynamic from "next/dynamic"
import { useLiveQuery } from "dexie-react-hooks"
import SwiperContainer from "../common/SwiperContainer"
import SubHeader from "./SubHeader"
import { db } from "@/app/_lib/db"
import { useEffect, useState } from "react"
import CategoryCard from "./CategoryCard"
import CategoryList from "../common/CategoryList"
import Button from "../common/Button"
import Dialog from "../common/Dialog"

const AddCategoryForm = dynamic(() => import("../categories/AddCategoryForm"))

export default function CategoriesCarousel() {
    const [categoryData, setCategoryData] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const transactions = useLiveQuery(() => db.getMonthTransactions());
    const categories = useLiveQuery(() => db.getAllCategories());

    useEffect(() => {
        if(transactions && categories) {
            const categoriesMap = {};
            for(let i = 0; i < categories.length; i++) {
                categoriesMap[categories[i].id] = {...categories[i], total: 0};
            }

            for(let i = 0; i < transactions.length; i++) {
                if(transactions[i].categoryId) categoriesMap[transactions[i].categoryId].total += Number(transactions[i].amount);
            }

            setCategoryData([...Object.values(categoriesMap)]);
        }
    }, [transactions, categories])

    if(!categoryData) {
        return (
            <div className="mb-4">
                <SubHeader loading title="Categories" description={"based on this month's remaining budget"} link="/categories"/>
                <div className="h-28 w-screen bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded-lg"></div>
            </div>
        )
    } else {
        return(
            <div className="mb-4">
                <SubHeader title="Categories" description={"based on this month's transaction"} onClick={() => setShowDialog(true)}/>
                {categoryData.length > 0 ?
                <SwiperContainer 
                    spaceBetween={12}
                    slidesPerView={1.8}
                    items={categoryData?.sort((a,b) => a.budget - b.budget).map(category => ({
                        id: category.id,
                        component: <CategoryCard {...category} slug={`/transactions?category=${encodeURIComponent(category.name)}`}/>
                    }))}
                /> :
                <div className="h-40 flex flex-col justify-center items-center gap-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded-lg py-6 px-4">
                    <p className="text-sm md:text-base text-center font-medium text-dark/80 dark:text-white/80">No category found, please create a new category</p>
                    <Button onClick={() => setShowAdd(true)} label="Add New Category" contained/>
                </div>}
                <CategoryList
                    show={showDialog}
                    hideFn={() => setShowDialog(false)}
                />
                <Dialog
                    show={showAdd}
                    hideFn={() => setShowAdd(false)}
                >
                    <AddCategoryForm onSubmit={() => setShowAdd(false)}/>
                </Dialog>
            </div>
        )
    }
}