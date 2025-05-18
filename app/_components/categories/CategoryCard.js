'use client'
import dynamic from "next/dynamic";
import { formatCurrency } from "@/app/_lib/utils";
import { memo, useState } from "react";
import ContextMenu from "../common/ContextMenu";
import { IoWallet as BudgetIcon } from "react-icons/io5";
import { IoMdMore as MoreIcon } from "react-icons/io";

const AddCategoryDialog = dynamic(() => import("../common/dialog/AddCategoryDialog"));
const DeleteCategoryDialog = dynamic(() => import("../common/dialog/DeleteCategoryDialog"));

function CategoryCard({ category, style }) {
    const { id, name, budget } = category;
    const [showMenu, setShowMenu] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const contextMenuItems = [
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
        <div style={style} className="relative not-last:border-b border-dark/20 dark:border-white/20 select-none">
            <div className="pl-2 py-2 flex">
                <div className="w-full flex gap-2 items-center">
                    <div className="flex flex-col gap-1 grow">
                        <p className="text-base font-semibold grow">{name}</p>
                        <div className="flex items-center gap-2">
                            <BudgetIcon size={18}/>
                            <p className="text-sm font-medium">{formatCurrency(budget)}</p>
                        </div>
                    </div>
                    <div onClick={() => setShowMenu(true)} className="cursor-pointer select-none p-2 rounded-full active:bg-neutral-300/30 active:dark:bg-neutral-800/30 transition-colors duration-150 ease-in-out">
                        <MoreIcon size={24}/>
                    </div>
                </div>
            </div>
            <ContextMenu 
                items={contextMenuItems} 
                show={showMenu} 
                hideFn={() => setShowMenu(false)}
                hideOnItemClick
            />
            <AddCategoryDialog 
                category={category}
                show={showEdit} 
                hideFn={() => setShowEdit(false)}
            />
            <DeleteCategoryDialog 
                categoryId={id} 
                show={showDelete} 
                hideFn={() => setShowDelete(false)}
            />
        </div>
    )
}

export default memo(CategoryCard);