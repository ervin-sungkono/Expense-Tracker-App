'use client'
import Dialog from "./Dialog";
import InputField from "../InputField";
import SelectField from "../SelectField";
import TextField from "../TextField";
import { db } from "@/app/_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Button from "../Button";
import { DateValidator, NumberValidator, StringValidator } from "@/app/_lib/validator";

export default function AddExpenseDialog({ expense = {}, show, hideFn }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());
    const [errorMessage, setErrorMessage] = useState({});

    const validateDate = (date) => {
        return new DateValidator("Date", date)
            .required()
            .date()
            .validate();
    }

    const validateAmount = (amount) => {
        return new NumberValidator("Amount", amount)
            .required()
            .min(1)
            .validate();
    }

    const validateCategory = (categoryId) => {
        return new StringValidator("Category", categoryId)
            .required()
            .validate();
    }

    const validateRemarks = (remarks) => {
        return new StringValidator("Notes", remarks)
            .required()
            .maxLength(120)
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
            const { date, amount, categoryId, remarks } = payload;

            error.date = validateDate(date);
            error.amount = validateAmount(amount);
            error.categoryId = validateCategory(categoryId);
            error.remarks = validateRemarks(remarks);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            payload.amount = Number(payload.amount); // ensure that value stored is Number type
            if(expense.id) {
                db.updateExpense(expense.id, payload);
            } else {
                db.addExpense(payload);
            }
            
            form.reset();
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
        }
    }

    const getDialogAction = () => {
        return expense ? 'Edit Expense' : 'Add Expense';
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
                            name={"date"} 
                            label={"Date"} 
                            type={"date"}
                            defaultValue={expense.date ?? new Date().toISOString().split('T')[0]}
                            errorMessage={errorMessage?.date}
                        />
                        <InputField 
                            required
                            name={"amount"} 
                            label={"Amount"} 
                            placeholder={"Enter amount"}
                            type={"number"}
                            defaultValue={expense.amount}
                            errorMessage={errorMessage?.amount}
                        />
                        {categories && <SelectField
                            required
                            label={"Category"}
                            name="categoryId"
                            _selected={expense.categoryId}
                            _options={categories.map(category => ({
                                id: category.id,
                                label: category.name
                            }))}
                            placeholder={"--Select Category--"}
                            errorMessage={errorMessage?.categoryId}
                        />}
                        {shops && <SelectField
                            label={"Shop"}
                            name="shopId"
                            _selected={expense.shopId}
                            _options={shops.map(shop => ({
                                id: shop.id,
                                label: shop.name
                            }))}
                            placeholder={"--Select Shop--"}
                        />}
                        <TextField
                            name={"remarks"} 
                            label={"Notes (max 120 characters)"} 
                            placeholder={"Enter notes"}
                            rows={4}
                            maxLength={120}
                            defaultValue={expense.remarks}
                            errorMessage={errorMessage?.remarks}
                        />
                    </div>
                    <Button type="submit" label={getDialogAction()}/>
                </form>
            </div>
        </Dialog>
    )
}