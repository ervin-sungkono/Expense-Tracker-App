import { formatCurrency } from "@/app/_lib/utils";

export default function RecentExpenseCard({ date, category, amount, remarks }) {
    return(
        <div className="relative px-4 py-2.5 flex not-last:border-b border-dark/20 dark:border-white/20">
            <div className="w-full flex flex-col gap-1">
                <div className="w-full flex items-center gap-1.5">
                    <p className="text-base md:text-lg font-medium grow">{category}</p>
                    <p className="text-sm md:text-base font-medium">{formatCurrency(amount)}</p>
                </div>
                <p className="text-xs text-dark/80 dark:text-white/80">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {remarks && <p className="text-xs text-dark/80 dark:text-white/80 line-clamp-2 mb-1">{remarks}</p>}
            </div>
            
        </div>
    )
}