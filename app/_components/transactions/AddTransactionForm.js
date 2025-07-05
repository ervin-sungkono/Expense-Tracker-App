'use client'
import dynamic from "next/dynamic";
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import TextField from "../common/TextField";
import { db } from "@/app/_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import Button from "../common/Button";
import { DateValidator, NumberValidator, StringValidator } from "@/app/_lib/validator";
import Image from "next/image";
import { dateToLocalInput, getOwnerLabel } from "@/app/_lib/utils";
import { MdFileUpload as UploadIcon } from "react-icons/md";
import Dialog from "../common/Dialog";
import removeMd from "remove-markdown";
import LoadingOverlay from "../common/LoadingOverlay";

const SelectCategoryPage = dynamic(() => import('../common/page/SelectCategoryPage'));
const UploadTransactionImage = dynamic(() => import('./UploadTransactionImage'));

export default function AddTransactionForm({ transaction = {}, onSubmit }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());
    const [transactionData, setTransactionData] = useState(transaction);
    const [errorMessage, setErrorMessage] = useState({});
    const [selectedCategory, setSelectedCategory] = useState(transactionData.category); 
    const [selectCategory, setSelectCategory] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [loading, setLoading] = useState(false);

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

    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        setSelectCategory(false);
    }

    const handleCancelSelection = () => {
        setSelectedCategory(null);
        setSelectCategory(false);
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
        payload.categoryId = selectedCategory?.id ?? null; // set to null if left unfilled
        payload.type = selectedCategory?.type;

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
            payload.date = new Date(payload.date);
            if(transactionData.id) {
                db.updateTransaction(transactionData.id, payload);
            } else {
                db.addTransaction(payload);
            }
            
            onSubmit && onSubmit();
        } catch(e) {
            console.log(e);
        }
    }

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

    const getDialogAction = () => {
        return transactionData.id ? 'Edit Transaction' : 'Add Transaction';
    }

    const handleImageExtract = ({ imageBase64, mimeType }) => {
        setLoading(true);
        fetch('api/image-extract', {
            method: 'POST',
            headers: {
                'accept': 'application/json'
            },
            body: JSON.stringify({
                mimeType,
                imageBase64
            })
        })
        .then(res => res.ok ? res.json() : null)
        .then(({ data }) => {
            if (data) {
                const rawText = removeMd(data?.content?.parts?.[0]?.text);
                const jsonResult = JSON.parse(rawText);
                setTransactionData((prevData) => ({
                    ...prevData,
                    date: jsonResult.date ? new Date(jsonResult.date) : prevData.date,
                    amount: jsonResult.amount ? Number(jsonResult.amount) : prevData.amount,
                    remarks: jsonResult.notes ? jsonResult.notes : prevData.remarks
                }))
            }
        })
        .catch(err => console.log(err))
        .finally(() => {
            setLoading(false);
            setShowUpload(false);
        })
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="text-xl font-bold grow">{getDialogAction()}</div>
                <div onClick={() => setShowUpload(true)} className="p-2 rounded-full active:bg-neutral-300/30 dark:active:bg-neutral-700/30 transition-colors ease-in-out">
                    <UploadIcon size={20}/>
                </div>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 mb-6">
                    <InputField 
                        required
                        name={"date"} 
                        label={"Date"} 
                        type={"datetime-local"}
                        defaultValue={transactionData.date ? dateToLocalInput(transactionData.date) : dateToLocalInput()}
                        errorMessage={errorMessage?.date}
                    />
                    <InputField 
                        required
                        name={"amount"} 
                        label={"Amount"} 
                        placeholder={"Enter amount"}
                        type={"number"}
                        defaultValue={transactionData.amount}
                        errorMessage={errorMessage?.amount}
                    />
                    {categories && <SelectField
                        required
                        label={"Category"}
                        name="categoryId"
                        errorMessage={errorMessage?.categoryId}
                        overrideOnClick={() => setSelectCategory(true)}
                        customSelected={renderCategorySelected()}
                    />}
                    {shops && selectedCategory?.type === 'Expense' && 
                    <SelectField
                        label={"Shop"}
                        name="shopId"
                        _selected={transactionData.shopId}
                        _options={shops.map(shop => ({
                            id: shop.id,
                            label: shop.name
                        }))}
                        placeholder={"--Select Shop--"}
                    />}
                    {selectedCategory?.type === 'DebtLoan' && 
                    <InputField 
                        name={"owner"} 
                        label={getOwnerLabel(selectedCategory.name)} 
                        placeholder={selectedCategory.name === 'Loan' ? 'Enter Borrower\'s name' : 'Enter Lender\s name'}
                        defaultValue={transactionData.owner ?? 'someone'}
                        errorMessage={errorMessage?.owner}
                    />}
                    <TextField
                        name={"remarks"} 
                        label={"Notes (max 120 characters)"} 
                        placeholder={"Enter notes"}
                        rows={4}
                        maxLength={120}
                        defaultValue={transactionData.remarks}
                        errorMessage={errorMessage?.remarks}
                    />
                </div>
                <Button type="submit" label={getDialogAction()}/>
            </form>
            <SelectCategoryPage
                show={selectCategory}
                hideFn={() => setSelectCategory(false)}
                showTab
                hideCancelButton
                categories={categories}
                onCategorySelected={handleCategorySelect}
                onCancelSelection={handleCancelSelection}
                defaultType="Expense"
            />
            <Dialog
                show={showUpload}
                hideFn={() => setShowUpload(false)}
            >
                <UploadTransactionImage onImageSubmit={handleImageExtract}/>
            </Dialog>
            {loading && <LoadingOverlay/>}
        </div>
    )
}