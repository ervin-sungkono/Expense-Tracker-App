'use client'
import Dialog from "./Dialog";
import InputField from "./InputField";
import SelectField from "./SelectField";
import { db } from "@/app/_lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import Button from "./Button";

export default function AddExpenseDialog({ show, hideFn }) {
    const categories = useLiveQuery(() => db.getAllCategories());
    const shops = useLiveQuery(() => db.getAllShops());

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const payload = {}

        for(const [key, value] of formData.entries()) {
            payload[key] = value;
        }

        db.addExpense(payload);
    }

    return (
        <Dialog 
            show={show} 
            hideFn={hideFn}
        >
            <div className="flex flex-col gap-4">
                <div className="text-xl font-bold">Add Expense</div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <InputField 
                        required
                        name={"date"} 
                        label={"Date"} 
                        placeholder={"Enter expense date"} 
                        type={"date"}
                        defaultValue={new Date().toISOString().split('T')[0]}
                    />
                    <InputField 
                        required
                        name={"amount"} 
                        label={"Amount"} 
                        placeholder={"Enter amount"}
                        type={"number"}
                    />
                    <SelectField
                        required
                        label={"Category"}
                        name="category"
                        _options={categories?.map(category => ({
                            id: category.id,
                            label: category.name
                        }))}
                        placeholder={"--Select Category--"}
                    />
                    <SelectField
                        label={"Shop"}
                        name="shop"
                        _options={shops?.map(shop => ({
                            id: shop.id,
                            label: shop.name
                        }))}
                        placeholder={"--Select Shop--"}
                    />
                    <InputField
                        name={"remarks"} 
                        label={"Remarks"} 
                        placeholder={"Enter remarks"}
                        type={"text"}
                    />
                    <Button className="mt-2" type="submit" label={"Add Expense"}/>
                </form>
            </div>
        </Dialog>
    )
}