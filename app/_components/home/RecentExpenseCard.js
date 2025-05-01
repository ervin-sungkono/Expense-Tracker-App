import { formatCurrency } from "@/app/_lib/utils";

export default function RecentExpenseCard({ date, category, amount, remarks }) {
    return(
        <div className="relative px-4 py-2.5 flex not-last:border-b border-dark/20 dark:border-white/20">
            <div className="flex flex-col gap-1 grow">
                <p className="text-base md:text-lg font-medium">{category}</p>
                {remarks && <p className="text-xs text-dark/80 dark:text-white/80 line-clamp-2 mb-1">{remarks}</p>}
                <p className="text-xs text-dark/80 dark:text-white/80">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <p className="text-sm md:text-base font-medium">{formatCurrency(amount)}</p>
        </div>
    )
}