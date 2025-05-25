'use client'
import dynamic from "next/dynamic";
import { formatCurrency, formatDateString } from "@/app/_lib/utils";
import { memo, useState } from "react";
import { useLongPress } from "use-long-press";
import ContextMenu from "../common/ContextMenu";
import { isMobile } from "react-device-detect";

const AddTransactionDialog = dynamic(() => import("./AddTransactionDialog"));
const DeleteTransactionDialog = dynamic(() => import("./DeleteTransactionDialog"));
const InfoTransactionDialog = dynamic(() => import("./InfoTransactionDialog"));

function TransactionCard({ transaction, style }) {
    const { id, date, category, amount } = transaction;
    const [showMenu, setShowMenu] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const handlers = useLongPress(() => {
        setShowMenu(true);
    }, {
        threshold: 500,
        detect: 'touch'
    });

    const contextMenuItems = [
        {
            label: 'Info',
            onClick: () => setShowInfo(true)
        },
        {
            label: 'Edit',
            onClick: () => setShowEdit(true)
        },
        {
            label: 'Delete',
            onClick: () => setShowDelete(true)
        }
    ]

    return(
        <div style={style} className="relative not-last:border-b border-dark/20 dark:border-white/20">
            <div {...handlers()} onClick={!isMobile ? () => setShowMenu(true) : null} className="cursor-pointer px-4 py-2 flex active:bg-neutral-300/30 active:dark:bg-neutral-800/30 transition-colors duration-150 ease-in-out">
                <div className="w-full flex flex-col gap-1">
                    <div className="w-full flex items-center gap-1.5">
                        <p className="text-base font-medium grow">{category}</p>
                        <p className="text-sm md:text-base font-medium">{formatCurrency(amount)}</p>
                    </div>
                    <p className="text-xs text-dark/80 dark:text-white/80">{formatDateString(date)}</p>
                </div>
            </div>
            <ContextMenu 
                items={contextMenuItems} 
                show={showMenu} 
                hideFn={() => setShowMenu(false)}
                hideOnItemClick
            />
            <InfoTransactionDialog 
                transaction={transaction} 
                show={showInfo} 
                hideFn={() => setShowInfo(false)}
            />
            <AddTransactionDialog 
                transaction={transaction} 
                show={showEdit} 
                hideFn={() => setShowEdit(false)}
            />
            <DeleteTransactionDialog 
                transactionId={id} 
                show={showDelete} 
                hideFn={() => setShowDelete(false)}
            />
        </div>
    )
}

export default memo(TransactionCard);