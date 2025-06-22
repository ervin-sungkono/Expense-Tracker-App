'use client'
import { formatCurrency, formatDateString, getDayDifference, isInDateRange } from "@/app/_lib/utils";
import Button from "../common/Button";

export default function InfoBudgetContent({ budget = {} }) {
    const totalDays = getDayDifference(budget.start_date, budget.end_date);
    const daysSinceStart = getDayDifference(budget.start_date, new Date());
    const activeDays = Math.max(0, Math.min(daysSinceStart, totalDays));
    const averageSpending = Math.max(0, Math.round(budget.totalTransaction / activeDays));
    const estimatedSpending = Math.max(0, Math.round(budget.remainingBudget / budget.remainingDays));

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
            value: formatCurrency(estimatedSpending)
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
                <div className="flex flex-col mt-1">
                    <div className="relative w-full h-1.5 md:h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                        {budget.remainingBudget < 0 ? 
                        <div className="absolute top-0 left-0 h-full bg-danger-gradient rounded-full" style={{ width: '100%' }}></div> :
                        <div className="absolute top-0 left-0 h-full bg-basic-gradient rounded-full" style={{ width: `${budget.remainingBudget / budget.amount * 100}%` }}></div>}
                    </div>
                    <div className="flex justify-between mt-2 font-medium">
                        <p className="text-sm">{budget.remainingDays} days left</p>
                        {budget.remainingBudget < 0 ? 
                        <p className="flex flex-col items-end gap-0.5 text-sm">
                            <span className="text-xs text-dark/60 dark:text-white/60">Overspent</span> 
                            <span>{formatCurrency(budget.remainingBudget * -1)}</span>
                        </p> :
                        <p className="flex flex-col items-end gap-0.5 text-sm">
                            <span className="text-xs text-dark/60 dark:text-white/60">Remaining</span>
                            <span>{formatCurrency(budget.remainingBudget)}</span>
                        </p>}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2.5">
                <Button label={"Delete"} style="danger" contained/>
                <Button label={"Edit"} contained/>
            </div>
        </div>
    )
}