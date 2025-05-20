'use client'
import Dialog from "../common/Dialog";
import InputField from "../common/InputField";
import { db } from "@/app/_lib/db";
import { useState } from "react";
import Button from "../common/Button";
import { NumberValidator, StringValidator } from "@/app/_lib/validator";

export default function AddCategoryDialog({ category = {}, show, hideFn }) {
    const [errorMessage, setErrorMessage] = useState({});

    const validateBudget = (budget) => {
        return new NumberValidator("Budget", budget)
            .required()
            .min(0)
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

        try{
            let error = {};
            payload.budget = Number(payload.budget); // ensure that value stored is Number type
            const { name, budget } = payload;

            error.name = validateName(name);
            error.budget = validateBudget(budget);

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

    return (
        <Dialog 
            show={show} 
            hideFn={hideFn}
        >
            <div className="flex flex-col gap-4">
                <div className="text-xl font-bold">{getDialogAction()}</div>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4 mb-6">
                        <InputField 
                            required
                            name={"name"} 
                            label={"Name"} 
                            placeholder={"Enter name"}
                            type={"text"}
                            defaultValue={category.name}
                            errorMessage={errorMessage?.name}
                        />
                        <InputField 
                            required
                            name={"budget"} 
                            label={"Budget"} 
                            placeholder={"Enter budget"}
                            type={"number"}
                            defaultValue={category.budget}
                            errorMessage={errorMessage?.budget}
                        />
                    </div>
                    <Button type="submit" label={getDialogAction()}/>
                </form>
            </div>
        </Dialog>
    )
}