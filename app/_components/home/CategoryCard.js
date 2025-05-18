import { formatCurrency } from "@/app/_lib/utils";
import { IoChevronForward as RightIcon } from "react-icons/io5";
import Link from "next/link";

export default function CategoryCard({ name, budget = 0, slug = '' }) {
    return(
        <Link href={slug} className={`h-28 flex flex-col items-end px-4 py-3 text-white ${budget >= 0 ? 'bg-basic-gradient hover:bg-basic-gradient--hover' : 'bg-danger-gradient hover:bg-danger-gradient--hover'} transition-colors duration-300 ease-in-out rounded-lg`}>
            <div className="w-full flex flex-col gap-0.5">
                <p className="text-base md:text-lg font-semibold">{name}</p>
                <p className="text-sm">Budget: {formatCurrency(budget)}</p>
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