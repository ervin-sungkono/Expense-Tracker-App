'use client'
import dynamic from "next/dynamic";
import { memo, useState } from "react";
import ContextMenu from "../common/ContextMenu";
import { IoMdMore as MoreIcon } from "react-icons/io";
import Image from "next/image";
import Dialog from "../common/Dialog";

const InfoCategoryContent = dynamic(() => import("./InfoCategoryContent"))
const AddCategoryForm = dynamic(() => import("./AddCategoryForm"));
const DeleteCategoryForm= dynamic(() => import("./DeleteCategoryForm"));

function CategoryCard({ category, onClick, style, depth = 0 }) {
    const { id, name, icon, mutable } = category;
    const [showMenu, setShowMenu] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const getMutableItems = () => {
        return mutable ? [
            {
                label: 'Edit',
                onClick: () => setShowEdit(true)
            },
            {
                label: 'Delete',
                onClick: () => setShowDelete(true)
            }
        ] : []
    }

    const contextMenuItems = [
        {
            label: 'Info',
            onClick: () => setShowInfo(true)
        },
        ...getMutableItems()
    ]

    const handleCategoryClick = () => {
        onClick && onClick(category);
    }

    return(
        <div style={{...style, marginLeft: `${24 * depth}px`}}>
            <div className="relative border-b border-dark/20 dark:border-white/20">
                <div onClick={handleCategoryClick} className={`py-2 flex ${onClick ? 'cursor-pointer active:bg-neutral-300/30 active:dark:bg-neutral-800/30' : ''}`}>
                    <div className="w-full flex gap-2.5 items-center">
                        <div className="flex items-center gap-2 grow">
                            <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full bg-ocean-blue">
                                {icon && <Image className="object-contain p-1.5 md:p-2" src={`./category_icons/${icon}`} alt="" fill/>}
                            </div>
                            <p className="text-sm md:text-base font-semibold grow">{name}</p>
                        </div>
                        {!onClick && 
                        <div onClick={() => setShowMenu(true)} className="cursor-pointer p-2 rounded-full active:bg-neutral-300/30 active:dark:bg-neutral-800/30 transition-colors duration-150 ease-in-out">
                            <MoreIcon size={24}/>
                        </div>}
                    </div>
                </div>
                {(depth === 0 && category.data?.length > 0) && <span className="absolute left-3 top-14 w-0.5 bg-neutral-200 dark:bg-neutral-600" style={{height: category.data.length * 56 - 26}}></span>}
                {depth > 0 && <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-neutral-200 dark:bg-neutral-600"></span>}
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
                    <InfoCategoryContent category={category}/>
                </Dialog>
                <Dialog
                    show={showEdit} 
                    hideFn={() => setShowEdit(false)}
                >
                    <AddCategoryForm category={category}/>
                </Dialog>
                <Dialog
                    show={showDelete} 
                    hideFn={() => setShowDelete(false)}
                >
                    <DeleteCategoryForm 
                        categoryId={id}
                        categoryName={name}
                        onDelete={() => setShowDelete(false)}
                    />
                </Dialog>
                
            </div>
            {category.data &&
            category.data.map(subcategory => (
                <CategoryCard key={subcategory.id} category={subcategory} onClick={onClick} style={{}} depth={depth + 1}/>
            ))}
        </div>
    )
}

export default memo(CategoryCard);