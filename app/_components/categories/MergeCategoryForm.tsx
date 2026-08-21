'use client'
import SelectField from "../common/SelectField";
import Button from "../common/Button";
import Image from "next/image";
import SelectCategoryPage from "../common/page/SelectCategoryPage";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@lib/db";
import { StringValidator } from "@lib/validator";
import { toast } from "react-toastify";

export default function MergeCategoryForm({ categoryId, onMergeCategory }) {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectCategory, setSelectCategory] = useState(false);
    const [errorMessage, setErrorMessage] = useState({});
    const categories = useLiveQuery(() => db.getMergeCategories(categoryId), [categoryId]);

    const renderCategorySelected = () => {
        if(!selectedCategory) return (
            <div className="flex items-center gap-2">
                <p className="text-dark dark:text-white text-sm">Select Category</p>
            </div>
        )
        return (
            <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 md:w-10 md:h-10 flex justify-center items-center bg-ocean-blue rounded-full">
                    {selectedCategory.icon && <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${selectedCategory.icon}`} alt="" fill/>}
                </div>
                <p className="text-dark dark:text-white text-sm">{selectedCategory.name}</p>
            </div>
        )
    }

    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        setSelectCategory(false);
    }

    const validateCategory = (categoryId) => {
        return new StringValidator('New Category', categoryId)
            .required()
            .validate();
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {};

        payload.categoryId = selectedCategory?.id ?? null;

        try{    
            let error = {};

            const { categoryId } = payload;

            error.categoryId = validateCategory(categoryId);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }
            
            toast.success('Category merged');
            onMergeCategory && onMergeCategory(categoryId);
        } catch(e) {
            console.log(e);
            toast.error('Fail to merge category');
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <div className="text-xl font-bold">Merge Category</div>
                <p className="text-dark/80 dark:text-white/80">All your transactions, budgets, and sub categories will be moved to the chosen category</p>
            </div> 
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 mb-6">
                    <SelectField
                        label={"New Category"}
                        name={"parentId"}
                        errorMessage={errorMessage?.categoryId}
                        overrideOnClick={() => setSelectCategory(true)}
                        customSelected={renderCategorySelected()}
                    />
                </div>
                <Button type="submit" label={"Confirm Merge"}/>
            </form>
            <SelectCategoryPage
                show={selectCategory}
                hideFn={() => setSelectCategory(false)}
                categories={categories?.filter(c => c.id !== categoryId)}
                onCategorySelected={handleCategorySelect}
                hideCancelButton
            />
        </div>
    )
}