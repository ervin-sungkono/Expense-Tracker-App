import { formatCurrency, getDebtLoanType } from "@lib/utils";
import { IoChevronForward as RightIcon } from "react-icons/io5";
import Link from "next/link";
import { memo } from "react";

function CategoryCard({ name, type, total = 0, slug = '' }) {
    const getCategoryType = () => {
        const categoryType = type === 'DebtLoan' ? getDebtLoanType(name) : type;
        return categoryType === 'Income';
    }

    return(
        <Link scroll={false} href={slug} className={`h-28 flex flex-col items-end px-4 py-3 text-white ${getCategoryType() ? 'bg-success-gradient hover:bg-success-gradient--hover' : 'bg-danger-gradient hover:bg-danger-gradient--hover'} transition-colors duration-300 ease-in-out rounded-lg`}>
            <div className="w-full flex flex-col gap-0.5">
                <p className="text-base md:text-lg font-semibold">{name}</p>
                <p className="text-sm">{getCategoryType() ? '+' : '-'}{formatCurrency(total)}</p>
            </div>
            <div className="grow flex items-end">
                <div className="flex items-center gap-1 text-sm">
                    <p>Details</p>
                    <RightIcon size={16}/>
                </div>
            </div>
        </Link>
    )
}

export default memo(CategoryCard);