'use client'
import { formatCurrency } from "@/app/_lib/utils";
import { useState } from "react";
import { useLongPress } from "use-long-press";
import ContextMenu from "../common/ContextMenu";

export default function RecentExpenseCard({ id, date, category, amount }) {
    const [showMenu, setShowMenu] = useState(false);
    const handlers = useLongPress(() => {
        setShowMenu(true);
    }, {
        threshold: 500
    });

    const contextMenuItems = [
        {
            label: 'Info',
        },
        {
            label: 'Edit',
        },
        {
            label: 'Delete',
        }
    ]

    return(
        <div className="relative not-last:border-b border-dark/20 dark:border-white/20">
            <div {...handlers()} className="cursor-pointer px-4 py-2 flex active:bg-neutral-300/30 active:dark:bg-neutral-800/30 transition-colors duration-150 ease-in-out">
                <div className="w-full flex flex-col gap-1">
                    <div className="w-full flex items-center gap-1.5">
                        <p className="text-base md:text-lg font-medium grow">{category}</p>
                        <p className="text-sm md:text-base font-medium">{formatCurrency(amount)}</p>
                    </div>
                    <p className="text-xs text-dark/80 dark:text-white/80">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>
            <ContextMenu 
                items={contextMenuItems} 
                show={showMenu} 
                hideFn={() => setShowMenu(false)}
            />
        </div>
    )
}