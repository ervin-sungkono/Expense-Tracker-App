import { formatCurrency, getDebtLoanType } from "@lib/utils";
import { IoChevronForward as RightIcon } from "react-icons/io5";
import Link from "next/link";
import { memo } from "react";

function CategoryCard({ name, type, total = 0, slug = '' }) {
    const getCategoryType = () => {
        const categoryType = type === 'DebtLoan' ? getDebtLoanType(name) : type;
        return categoryType === 'Income';
    }
    const isZero = Number(total) === 0;
    const cardColor = isZero
        ? 'bg-neutral-500 hover:bg-neutral-600'
        : getCategoryType()
            ? 'bg-success-gradient hover:bg-success-gradient--hover'
            : 'bg-danger-gradient hover:bg-danger-gradient--hover';

    return(
        <Link scroll={false} href={slug} className={`h-28 flex flex-col items-end px-4 py-3 text-white ${cardColor} transition-colors duration-300 ease-in-out rounded-lg`}>
            <div className="w-full flex flex-col gap-0.5">
                <p className="text-base md:text-lg font-semibold">{name}</p>
                <p className="text-sm">{!isZero && (getCategoryType() ? '+' : '-')}{formatCurrency(total)}</p>
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
