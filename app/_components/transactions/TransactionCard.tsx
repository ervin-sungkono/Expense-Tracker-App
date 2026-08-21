'use client'
import dynamic from "next/dynamic";
import { formatCurrency } from "@lib/utils";
import { memo, useState } from "react";
import { useLongPress } from "use-long-press";
import ContextMenu from "../common/ContextMenu";
import { isMobile } from "react-device-detect";
import Dialog from "../common/Dialog";
import Image from "next/image";

const AddTransactionForm = dynamic(() => import("./AddTransactionForm"));
const DeleteTransactionForm = dynamic(() => import("./DeleteTransactionForm"));
const InfoTransactionForm = dynamic(() => import("./InfoTransactionForm"));

function TransactionCard({ transaction }) {
    const { id, category, amount, remarks } = transaction;
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
        <div className="relative not-last:border-b border-dark/20 dark:border-white/20 flex items-center">
            <div {...handlers()} onClick={!isMobile ? () => setShowMenu(true) : null} className="w-full h-full cursor-pointer px-2.5 md:px-4 py-2 flex active:bg-neutral-300/30 dark:active:bg-light/10 transition-colors duration-150 ease-in-out">
                <div className="w-full flex items-center gap-2.5">
                    <div className="relative shrink-0 w-8 h-8 md:w-10 md:h-10 flex justify-center items-center bg-ocean-blue rounded-full">
                        {category?.icon && <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${category?.icon}`} alt="" fill/>}
                    </div>
                    <div className="w-full flex items-center gap-1.5">
                        <div className="grow flex flex-col gap-1">
                            <p className="text-sm md:text-base font-medium grow">{category?.name}</p>
                            <p className="text-xs md:text-sm line-clamp-1 text-dark/80 dark:text-white/80">{remarks}</p>
                        </div>
                        <p className="text-sm md:text-base font-medium">{formatCurrency(amount)}</p>
                    </div>
                </div>
            </div>
            <ContextMenu 
                items={contextMenuItems} 
                show={showMenu} 
                hideFn={() => setShowMenu(false)}
                hideOnItemClick
            />
            <Dialog
                show={showInfo} 
                hideFn={() => setShowInfo(false)}
            >
                <InfoTransactionForm 
                    transaction={transaction} 
                    hideFn={() => setShowInfo(false)}
                />
            </Dialog>
            <Dialog
                show={showEdit} 
                hideFn={() => setShowEdit(false)}
            >
                <AddTransactionForm 
                    transaction={transaction} 
                    onSubmit={() => setShowEdit(false)}
                />
            </Dialog>
            <Dialog
                show={showDelete} 
                hideFn={() => setShowDelete(false)}
                hideCancelButton
            >
                <DeleteTransactionForm
                    transactionId={id}
                    onDelete={() => setShowDelete(false)}
                    onCancel={() => setShowDelete(false)}
                />
            </Dialog>
        </div>
    )
}

export default memo(TransactionCard);