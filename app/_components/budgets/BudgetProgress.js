import { formatDate, formatCurrency } from "@/app/_lib/utils";

export default function BudgetProgress({ dateRange, daysSinceStart, remainingDays, remainingBudget, budgetAmount }) {
    return(
        <div className="flex flex-col mt-1">
            {dateRange &&
            <div className="flex justify-between mb-1.5 text-dark/80 dark:text-white/80">
                <p className="text-sm">{formatDate(dateRange[0])}</p>
                <p className="text-sm">{formatDate(dateRange[1])}</p>
            </div>}
            <div className="relative w-full h-1.5 md:h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                {remainingBudget < 0 ? 
                <div className="absolute top-0 left-0 h-full bg-danger-gradient rounded-full" style={{ width: '100%' }}></div> :
                <div className="absolute top-0 left-0 h-full bg-basic-gradient rounded-full" style={{ width: `${remainingBudget / budgetAmount * 100}%` }}></div>}
            </div>
            <div className="flex justify-between mt-2 font-medium">
                <p className="text-sm">{daysSinceStart < 0 ? `${daysSinceStart * -1} days to begin` : `${remainingDays} days left`}</p>
                {remainingBudget < 0 ? 
                <p className="flex flex-col items-end gap-0.5 text-sm">
                    <span className="text-xs text-dark/60 dark:text-white/60">Overspent</span> 
                    <span>{formatCurrency(remainingBudget * -1)}</span>
                </p> :
                <p className="flex flex-col items-end gap-0.5 text-sm">
                    <span className="text-xs text-dark/60 dark:text-white/60">Remaining</span>
                    <span>{formatCurrency(remainingBudget)}</span>
                </p>}
            </div>
        </div>
    )
}