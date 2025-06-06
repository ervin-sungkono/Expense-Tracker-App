'use client'
import Dialog from "../common/Dialog";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import { db } from "@/app/_lib/db";
import { useEffect, useState } from "react";
import Button from "../common/Button";
import { StringValidator } from "@/app/_lib/validator";
import { useLiveQuery } from "dexie-react-hooks";
import SelectIconPage from "./SelectIconPage";
import Image from "next/image";
import SelectCategoryPage from "./SelectCategoryPage";

export default function AddCategoryDialog({ category = {}, show, hideFn }) {
    const [errorMessage, setErrorMessage] = useState({});
    const [selectIcon, setSelectIcon] = useState(false);
    const [selectParent, setSelectParent] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState(category.icon ?? 'sky--weather_star.svg');
    const [selectedParent, setSelectedParent] = useState(null);
    const [selectedType, setSelectedType] = useState(category.type ?? 'Expense');

    const parentCategories = useLiveQuery(() => db.getParentCategories(selectedType), [selectedType]);

    useEffect(() => {
        if(category.parentId && parentCategories) setSelectedParent(parentCategories.find(pc => pc.id === category.parentId));
    }, [category.parentId, parentCategories])

    const typeOptions = [
        { id: 'Expense', label: 'Expense' },
        { id: 'Income', label: 'Income' },
    ]

    const validateIcon = (icon) => {
        return new StringValidator("Icon", icon)
            .required()
            .validate();
    }

    const validateType = (type) => {
        return new StringValidator("Type", type)
            .required()
            .validate();
    }

    const validateName = (name) => {
        return new StringValidator("Name", name)
            .required()
            .minLength(3)
            .maxLength(30)
            .validate();
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        // Create payload for add expense
        const payload = {}
        for(const [key, value] of formData.entries()) {
            payload[key] = value;
        }

        payload.icon = selectedIcon;
        payload.parentId = selectedParent?.id ?? null; // set to null if left unfilled

        try{
            let error = {};
            const { name, type, icon } = payload;

            error.name = validateName(name);
            error.type = validateType(type);
            error.icon = validateIcon(icon);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            if(category.id) {
                db.updateCategory(category.id, payload);
            } else {
                db.addCategory(payload);
            }
            
            resetForm(form);
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
        }
    }
     
    const resetForm = (form) => {
        form.reset();
        setSelectedType(null);
        setSelectedParent(null);
        setSelectedIcon('sky--weather_star.svg');
    }

    const getDialogAction = () => {
        return category.id ? 'Edit Category' : 'Add Category';
    }

    const renderIconSelected = () => {
        return (
            <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 md:w-10 md:h-10 flex justify-center items-center bg-ocean-blue rounded-full">
                    <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${selectedIcon}`} alt="" fill/>
                </div>
                <p className="text-dark dark:text-white text-sm">Change Icon</p>
            </div>
        )
    }

    const renderParentSelected = () => {
        if(!selectedParent) return (
            <div className="flex items-center gap-2">
                <p className="text-dark dark:text-white text-sm">Select Parent Category</p>
            </div>
        )
        return (
            <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 md:w-10 md:h-10 flex justify-center items-center bg-ocean-blue rounded-full">
                    {selectedParent.icon && <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${selectedParent.icon}`} alt="" fill/>}
                </div>
                <p className="text-dark dark:text-white text-sm">{selectedParent.name}</p>
            </div>
        )
    }

    return (
        <>
            <Dialog 
                show={show} 
                hideFn={hideFn}
            >
                <div className="flex flex-col gap-4">
                    <div className="text-xl font-bold">{getDialogAction()}</div>
                    <form onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-4 mb-6">
                            <SelectField
                                required
                                label={"Icon"}
                                name={"icon"}
                                placeholder={selectedIcon ? "Change Icon" : "Select Icon"}
                                errorMessage={errorMessage?.icon}
                                overrideOnClick={() => setSelectIcon(true)}
                                customSelected={renderIconSelected()}
                            />
                            <InputField 
                                required
                                name={"name"} 
                                label={"Name"} 
                                placeholder={"Enter name"}
                                type={"text"}
                                defaultValue={category.name}
                                errorMessage={errorMessage?.name}
                            />
                            <SelectField
                                required
                                label={"Type"}
                                name={"type"}
                                _selected={selectedType}
                                placeholder={"Select Type"}
                                _options={typeOptions}
                                errorMessage={errorMessage?.type}
                                disabled={category.id != null}
                                onChange={(type) => setSelectedType(type)}
                            />
                            <SelectField
                                label={"Parent Category"}
                                name={"parentId"}
                                errorMessage={errorMessage?.parentId}
                                overrideOnClick={() => setSelectParent(true)}
                                customSelected={renderParentSelected()}
                            />
                        </div>
                        <Button type="submit" label={getDialogAction()}/>
                    </form>
                </div>
            </Dialog>
            <SelectIconPage
                show={selectIcon}
                hideFn={() => setSelectIcon(false)}
                onIconSelected={(icon) => setSelectedIcon(icon)}
            />
            <SelectCategoryPage
                show={selectParent}
                hideFn={() => setSelectParent(false)}
                categories={parentCategories?.filter(c => c.id !== category.id)}
                onCategorySelected={(parentId) => setSelectedParent(parentId)}
                onCancelSelection={() => setSelectedParent(null)}
            />
        </>
    )
}