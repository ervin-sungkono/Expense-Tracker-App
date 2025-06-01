'use client'
import Dialog from "../common/Dialog";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import { db } from "@/app/_lib/db";
import { useState } from "react";
import Button from "../common/Button";
import { StringValidator } from "@/app/_lib/validator";
import { useLiveQuery } from "dexie-react-hooks";
import SelectIconPage from "./SelectIconPage";
import Image from "next/image";

export default function AddCategoryDialog({ category = {}, show, hideFn }) {
    const [errorMessage, setErrorMessage] = useState({});
    const [selectIcon, setSelectIcon] = useState(false);
    const [selectParent, setSelectParent] = useState(false);
    const [selectedIcon, setSelectedIcon] = useState(category.icon ?? 'sky--weather_star.svg');
    const [selectedParent, setSelectedParent] = useState(category.parentId);

    const parentCategories = useLiveQuery(() => db.getParentCategories(category.type));

    const typeOptions = [
        { id: 'Expense', label: 'Expense' },
        { id: 'Income', label: 'Income' },
    ]

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

    const handleIconSelect = (icon) => {
        setSelectedIcon(icon);
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
        payload.parentId = selectedParent;

        try{
            let error = {};
            const { name, type } = payload;

            error.name = validateName(name);
            error.type = validateType(type);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            if(category.id) {
                db.updateCategory(category.id, payload);
            } else {
                db.addCategory(payload);
            }
            
            form.reset();
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
        }
    }

    const getDialogAction = () => {
        return category.id ? 'Edit Category' : 'Add Category';
    }

    const renderIconSelected = () => {
        return (
            <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 md:w-10 md:h-10 flex justify-center items-center bg-neutral-200 dark:bg-neutral-600 rounded-full">
                    <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${selectedIcon}`} alt="" fill/>
                </div>
                <p className="text-dark dark:text-white text-sm">Change Icon</p>
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
                                _selected={category.type}
                                placeholder={"Select Type"}
                                _options={typeOptions}
                                errorMessage={errorMessage?.type}
                                disabled={category.id != null}
                            />
                            <SelectField
                                required
                                label={"Parent Category"}
                                name={"parentId"}
                                _selected={category.parentId}
                                placeholder={"Select Parent Category"}
                                _options={parentCategories?.map(category => ({ id: category.id, label: category.name }))}
                                errorMessage={errorMessage?.parentId}
                                overrideOnClick={() => console.log('OPENING SELECT CATEGORY')}
                            />
                        </div>
                        <Button type="submit" label={getDialogAction()}/>
                    </form>
                </div>
            </Dialog>
            <SelectIconPage
                show={selectIcon}
                hideFn={() => setSelectIcon(false)}
                onIconSelected={handleIconSelect}
            />
        </>
    )
}