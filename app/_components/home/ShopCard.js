'use client'
import Link from "next/link"
import Image from "next/image"
import { IoLocationSharp as LocationIcon } from "react-icons/io5";
import { IoMdPricetags as PriceIcon } from "react-icons/io";
import { formatCurrency } from "@/app/_lib/utils";

export default function ShopCard({ name, image, location, totalVisit, averageExpense }) {    
    const showTotalVisit = () => {
        if (totalVisit === 0) return 'Not visited';
        return `Visited ${totalVisit} ${totalVisit > 1 ? 'times' : 'time'}`;
    }

    return(
        <Link href={`/expenses?shop=${encodeURIComponent(name)}`} className="w-full flex flex-col">
            <div className="relative w-full aspect-video bg-neutral-200 dark:bg-neutral-700 rounded-t-lg overflow-hidden">
                <Image src={image} className="object-contain" fill alt={`${name} Image`}/>
            </div>
            <div className="pt-2.5 pb-4 px-4 rounded-b-lg bg-white dark:bg-neutral-700">
                <p className="text-base md:text-lg font-semibold mb-2">{name}</p>
                <div className="flex flex-col gap-1">
                    <div className="text-sm text-dark/80 dark:text-white/80 flex items-center gap-1">
                        <PriceIcon size={20}/>
                        <p>{formatCurrency(averageExpense)}</p>
                    </div>
                    <div className="text-sm text-dark/80 dark:text-white/80 flex items-center gap-1">
                        <LocationIcon size={20}/>
                        <p>{location}</p>
                    </div>
                </div>
                <p className="text-sm text-dark/80 dark:text-white/80 mt-1.5">{showTotalVisit()}</p>
            </div>
        </Link>
    )
}