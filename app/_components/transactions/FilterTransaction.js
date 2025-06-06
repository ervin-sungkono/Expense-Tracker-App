import SelectField from "../common/SelectField";
import Button from "../common/Button";
import { useLiveQuery } from "dexie-react-hooks";
import { useSearchParams } from "next/navigation";
import { db } from "@/app/_lib/db";
import InputField from "../common/InputField";
import { useState, useEffect } from "react";

export default function FilterTransaction({ onSubmit, filterOptions = {}, setFilterOptions }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());
    const [errorMessage, setErrorMessage] = useState({});

    const searchParams = useSearchParams();
    const category = searchParams.get('category');
    const shop = searchParams.get('shop');

    useEffect(() => {
            if(category && categories) {
                setFilterOptions((prevOptions) => ({
                    ...prevOptions,
                    categoryId: categories.find(c => c.name.toLowerCase() === category.toLowerCase())?.id
                }))
            }
    }, [category, categories])

    useEffect(() => {
        if(shop && shops) {
            setFilterOptions((prevOptions) => ({
                ...prevOptions,
                shopId: shops.find(s => s.name.toLowerCase() === shop.toLowerCase())?.id
            }))
        }
    }, [shop, shops])

    const validateAmount = (minAmount, maxAmount = Infinity) => {
        if(minAmount <= 0 || maxAmount <= 0) {
            return 'Amount must be greater than 0';
        }
        if(minAmount >= maxAmount) {
            return 'Minimum amount must be less than than maximum amount'
        }
    }

    const validateDate = (startDate, endDate) => {
        if (startDate && isNaN(new Date(startDate))) {
            return 'Start Date must be valid date!';
        }

        if (endDate && isNaN(new Date(endDate))) {
            return 'End Date must be valid date!';
        }

        if(new Date(startDate).getTime() > new Date(endDate).getTime()) {
            return 'Start Date must not be later than End Date';
        }
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
            let { categoryId, shopId, min_amount, max_amount, start_date, end_date } = payload;

            categoryId = categoryId === 'default' ? null : categoryId;
            shopId = shopId === 'default' ? null : shopId;
            min_amount = min_amount ? Number(min_amount) : undefined;
            max_amount = max_amount ? Number(max_amount) : undefined;
            start_date = start_date || undefined;
            end_date = end_date || undefined;

            error.amount = validateAmount(min_amount, max_amount);
            error.date = validateDate(start_date, end_date);
            
            setErrorMessage(error);
            if(Object.values(error).filter(Boolean).length > 0) {
                return;
            }

            setFilterOptions({
                categoryId,
                shopId,
                amountRange: [min_amount, max_amount],
                dateRange: [start_date, end_date]
            });

            onSubmit && onSubmit();
        } catch(e) {
            console.log(e);
        }
    }

    return(
        <div className="flex flex-col gap-4">
            <div className="text-xl font-bold">Filter Transaction</div>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-4 mb-6">
                    {categories && <SelectField
                        label={"Category"}
                        name="categoryId"
                        _selected={filterOptions.categoryId ?? 'default'}
                        _options={[
                            { id: 'default', label: 'All' },
                            ...categories.map(category => ({
                                id: category.id,
                                label: category.name
                            }))
                        ]}
                        placeholder={"--Select Category--"}
                    />}
                    {shops && <SelectField
                        label={"Shop"}
                        name="shopId"
                        _selected={filterOptions.shopId ?? 'default'}
                        _options={[
                            { id: 'default', label: 'All' },
                            ...shops.map(shop => ({
                                id: shop.id,
                                label: shop.name
                            }))
                        ]}
                        placeholder={"--Select Shop--"}
                    />}
                    <div className="w-full flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <InputField 
                                name={"min_amount"} 
                                label={"Min Amount"} 
                                placeholder={"Enter min amount"}
                                type={"number"}
                                defaultValue={filterOptions.amountRange[0]}
                            />
                            <InputField 
                                name={"max_amount"} 
                                label={"Max Amount"} 
                                placeholder={"Enter max amount"}
                                type={"number"}
                                defaultValue={filterOptions.amountRange[1]}
                            />
                        </div>
                        {errorMessage.amount && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400">{errorMessage.amount}</p>}
                    </div>
                    <div className="w-full flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <InputField 
                                name={"start_date"} 
                                label={"Start Date"} 
                                type={"date"}
                                defaultValue={filterOptions.dateRange[0]}
                            />
                            <InputField 
                                name={"end_date"} 
                                label={"End Date"} 
                                type={"date"}
                                defaultValue={filterOptions.dateRange[1]}
                            />
                        
                        </div>
                        {errorMessage.date && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400">{errorMessage.date}</p>}
                    </div>
                </div>
                <Button type="submit" label={"Filter"}/>
            </form>
        </div>
    )
}