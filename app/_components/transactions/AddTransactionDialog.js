'use client'
import Dialog from "../common/Dialog";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextField from "../common/TextField";
import { db } from "@/app/_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Button from "../common/Button";
import { DateValidator, NumberValidator, StringValidator } from "@/app/_lib/validator";

export default function AddTransactionDialog({ transaction = {}, show, hideFn }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());
    const [errorMessage, setErrorMessage] = useState({});
    const [selectedCategory, setSelectedCategory] = useState(null); 
    const [selectCategory, setSelectCategory] = useState(false);

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
            .maxLength(120)
            .validate();
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        // Create payload for add transaction
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
            if(transaction.id) {
                db.updateTransaction(transaction.id, payload);
            } else {
                db.addTransaction(payload);
            }
            
            form.reset();
            hideFn && hideFn();
        } catch(e) {
            console.log(e);
        }
    }

    const getDialogAction = () => {
        return transaction.id ? 'Edit Transaction' : 'Add Transaction';
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
                            type={"datetime-local"}
                            defaultValue={transaction.date ?? new Date().toISOString().slice(0,16)}
                            errorMessage={errorMessage?.date}
                        />
                        <InputField 
                            required
                            name={"amount"} 
                            label={"Amount"} 
                            placeholder={"Enter amount"}
                            type={"number"}
                            defaultValue={transaction.amount}
                            errorMessage={errorMessage?.amount}
                        />
                        {categories && <SelectField
                            required
                            label={"Category"}
                            name="categoryId"
                            placeholder={"--Select Category--"}
                            errorMessage={errorMessage?.categoryId}
                            overrideOnClick={() => setSelectCategory(true)}
                        />}
                        {shops && selectedCategory?.type === 'Expense' && 
                        <SelectField
                            label={"Shop"}
                            name="shopId"
                            _selected={transaction.shopId}
                            _options={shops.map(shop => ({
                                id: shop.id,
                                label: shop.name
                            }))}
                            placeholder={"--Select Shop--"}
                        />}
                        {selectedCategory?.type === 'DebtLoan' && 
                        <InputField 
                            name={"owner"} 
                            label={selectedCategory.name === 'Loan' ? 'Borrower' : 'Lender'} 
                            placeholder={selectedCategory.name === 'Loan' ? 'Enter Borrower\'s name' : 'Enter Lender\s name'}
                            defaultValue={transaction.owner ?? 'someone'}
                            errorMessage={errorMessage?.owner}
                        />}
                        <TextField
                            name={"remarks"} 
                            label={"Notes (max 120 characters)"} 
                            placeholder={"Enter notes"}
                            rows={4}
                            maxLength={120}
                            defaultValue={transaction.remarks}
                            errorMessage={errorMessage?.remarks}
                        />
                    </div>
                    <Button type="submit" label={getDialogAction()}/>
                </form>
            </div>
        </Dialog>
    )
}