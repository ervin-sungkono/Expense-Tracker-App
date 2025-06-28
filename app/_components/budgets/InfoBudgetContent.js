'use client'
import dynamic from "next/dynamic";
import { formatCurrency, formatDateString, getDayDifference, isInDateRange } from "@/app/_lib/utils";
import Button from "../common/Button";
import BudgetProgress from "./BudgetProgress";
import { useState } from "react";
import Dialog from "../common/Dialog";

const AddBudgetForm = dynamic(() => import("./AddBudgetForm"));
const DeleteBudgetForm = dynamic(() => import("./DeleteBudgetForm"));

export default function InfoBudgetContent({ budget = {}, hideFn }) {
    const totalDays = getDayDifference(budget.start_date, budget.end_date);
    const daysSinceStart = getDayDifference(budget.start_date, new Date());
    const activeDays = Math.max(0, Math.min(daysSinceStart, totalDays));
    const averageSpending = Math.max(0, Math.round(budget.totalTransaction / activeDays));
    const estimatedSpending = Math.max(0, Math.round(budget.remainingBudget / budget.remainingDays));

    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const handleDelete = () => {
        setShowDelete(false);
        hideFn && hideFn();
    }

    const contents = [
        {
            label: "Date",
            value: `${formatDateString(budget.start_date)} - ${formatDateString(budget.end_date)}`
        },
        {
            label: "Amount",
            value: formatCurrency(budget.amount)
        },
        {
            label: "Average daily spending",
            value: formatCurrency(averageSpending),
            hidden: !isInDateRange(new Date(), [budget.start_date, budget.end_date])
        },
        {
            label: "Target daily spending",
            value: formatCurrency(estimatedSpending),
            hidden: !isInDateRange(new Date(), [budget.start_date, budget.end_date])
        },
        {
            label: "Category",
            value: budget.category.name
        }
    ]
    
    return (
        <div className="flex flex-col gap-4">
            <div className="text-xl text-center font-bold">Budget Detail</div>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-4">
                    {contents.map(({label, value, hidden = false}) => (
                        !hidden && 
                        <div key={label} className="flex flex-col gap-1 pb-2 not-last:mb-2 not-last:border-b border-dark/20 dark:border-white/20">
                            <p className="uppercase text-xs md:text-sm font-semibold text-dark/80 dark:text-white/80">{label}</p>
                            <p className="text-sm md:text-base text-dark dark:text-white">{value}</p>
                        </div>
                    ))}
                </div>
                <BudgetProgress
                    daysSinceStart={daysSinceStart}
                    remainingDays={budget.remainingDays}
                    remainingBudget={budget.remainingBudget}
                    budgetAmount={budget.amount}
                />
            </div>
            <div className="flex justify-end gap-2.5">
                <Button label={"Delete"} style="danger" contained onClick={() => setShowDelete(true)}/>
                <Button label={"Edit"} contained onClick={() => setShowEdit(true)}/>
            </div>
            <Dialog
                show={showEdit}
                hideFn={() => setShowEdit(false)}
            >
                <AddBudgetForm
                    budget={budget}
                    onSubmit={() => setShowEdit(false)}
                />
            </Dialog>
            <Dialog
                show={showDelete}
                hideFn={() => setShowDelete(false)}
            >
                <DeleteBudgetForm
                    budgetId={budget.id}
                    onDelete={handleDelete}
                    onCancel={() => setShowDelete(false)}
                />
            </Dialog>
        </div>
    )
}