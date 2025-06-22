'use client'
import InputField from "../common/InputField";
import SelectField from "../common/SelectField";
import ToggleSwitch from "../common/ToggleSwitch";
import { db } from "@/app/_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import Button from "../common/Button";
import { DateValidator, NumberValidator, StringValidator } from "@/app/_lib/validator";
import Image from "next/image";
import SelectCategoryPage from "../common/page/SelectCategoryPage";
import { dateToInputValue, getDateRange } from "@/app/_lib/utils";

export default function AddBudgetForm({ budget = {}, onSubmit }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const [errorMessage, setErrorMessage] = useState({});
    const [selectedCategory, setSelectedCategory] = useState(budget.category); 
    const [selectCategory, setSelectCategory] = useState(false);
    const [repeat, setRepeat] = useState(false);
    const [duration, setDuration] = useState('weekly');
    const [dateRange, setDateRange] = useState([undefined, undefined]);

    const excludedCategory = ["Debt", "Debt Collection"];

    const durationOptions = [
        {
            id: "weekly",
            label: "This week"
        },
        {
            id: "monthly",
            label: "This month"
        },
        {
            id: "quarter",
            label: "This quarter"
        },
        {
            id: "annual",
            label: "This year"
        },
        {
            id: "custom",
            label: "Custom range"
        }
    ]

    useEffect(() => {
        setDateRange(getDateRange(duration));
    }, [duration])

    const validateDate = (startDate, endDate) => {
        const startDateValidation = new DateValidator('Start Date', startDate)
            .required()
            .date()
            .validate();

        const endDateValidation = new DateValidator('End Date', endDate)
            .required()
            .date()
            .validate();

        let rangeDateValidation = null;
        if(new Date(startDate).getTime() > new Date(endDate).getTime()) {
            rangeDateValidation = 'Start Date must not be later than End Date';
        }

        return startDateValidation ?? endDateValidation ?? rangeDateValidation;
        
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

        // Create payload for add budget
        const payload = {}
        for(const [key, value] of formData.entries()) {
            payload[key] = value;
        }
        payload.categoryId = selectedCategory?.id ?? null; // set to null if left unfilled
        payload.repeat = duration === 'custom' ? false : repeat; // if custom range then repeat is false by default

        try{
            let error = {};
            const { start_date, end_date, amount, categoryId } = payload;

            error.date = validateDate(start_date, end_date);
            error.amount = validateAmount(amount);
            error.categoryId = validateCategory(categoryId);

            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            payload.amount = Number(payload.amount); // ensure that value stored is Number type
            payload.start_date = new Date(payload.start_date);
            payload.end_date = new Date(payload.end_date);
            payload.start_date.setHours(0, 0, 0, 0);
            payload.end_date.setHours(23, 59, 59, 999);

            if(budget.id) {
                db.updateBudget(budget.id, payload);
            } else {
                db.addBudget(payload);
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
        return budget.id ? 'Edit Budget' : 'Add Budget';
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="text-xl font-bold">{getDialogAction()}</div>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 mb-6">
                    <SelectField
                        required
                        name={"duration"}
                        label={"Duration"}
                        _selected={duration}
                        _options={durationOptions}
                        onChange={(id) => setDuration(id)}
                    />
                    <div className="w-full flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <InputField 
                                required
                                name={"start_date"} 
                                label={"Start Date"} 
                                type={"date"}
                                defaultValue={dateToInputValue(dateRange[0])}
                                onChange={(e) => setDateRange((prevRange) => [new Date(e.target.value), prevRange[1]])}
                                readOnly={duration !== 'custom'}
                            />
                            <InputField 
                                required
                                name={"end_date"} 
                                label={"End Date"} 
                                type={"date"}
                                defaultValue={dateToInputValue(dateRange[1])}
                                onChange={(e) => setDateRange((prevRange) => [prevRange[0], new Date(e.target.value)])}
                                readOnly={duration !== 'custom'}
                            />
                        </div>
                        {errorMessage.date && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400">{errorMessage.date}</p>}
                    </div>
                    <InputField 
                        required
                        name={"amount"} 
                        label={"Amount"} 
                        placeholder={"Enter amount"}
                        type={"number"}
                        defaultValue={budget.amount}
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
                    {duration !== 'custom' &&
                    <div className="flex flex-col gap-2 text-dark dark:text-white">
                        <p className="text-xs md:text-sm font-semibold">Enable budget repeat</p>
                        <ToggleSwitch switchStatus={repeat} onStatusChange={(status) => setRepeat(status)}/>
                    </div>}
                </div>
                <Button type="submit" label={getDialogAction()}/>
            </form>
            <SelectCategoryPage
                show={selectCategory}
                hideFn={() => setSelectCategory(false)}
                showTab
                hideCancelButton
                categories={categories?.filter(c => !excludedCategory.includes(c.name))}
                onCategorySelected={handleCategorySelect}
                onCancelSelection={handleCancelSelection}
                defaultType="Expense"
                excludedTabs={["Income"]}
            />
        </div>
    )
}