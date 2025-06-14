'use client'
import dynamic from "next/dynamic";
import { IoMdMore as MoreIcon } from "react-icons/io";
import ContextMenu from "./ContextMenu";
import BalanceView from "./BalanceView";
import { useState } from "react";
import Page from "./Page";

const CategoryList = dynamic(() => import("./CategoryList"));
const AboutApp = dynamic(() => import("../settings/AboutApp"));

export default function ActionBar() {
    const [showMenu, setShowMenu] = useState(false);
    const [showCategory, setShowCategory] = useState(false);
    const [showBudget, setShowBudget] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [showAbout, setShowAbout] = useState(false);

    const items = [
        {
            label: 'Categories',
            onClick: () => setShowCategory(true)
        },
        {
            label: 'Budgets',
            onClick: () => setShowBudget(true)
        },
        {
            label: 'Reports',
            onClick: () => setShowReport(true)
        },
        {
            label: 'About',
            onClick: () => setShowAbout(true)
        }
    ]

    return(
        <div className="max-w-2xl w-full px-6 py-1.5 mx-auto bg-ocean-blue ">
            <div className="relative w-full flex items-center">
                <BalanceView/>
                <div onClick={() => setShowMenu(true)} className="text-white cursor-pointer p-1.5 rounded-ful active:bg-white/20 rounded-full transition-colors duration-150 ease-in-out">
                    <MoreIcon size={24}/>
                </div>
                <ContextMenu
                    items={items}
                    show={showMenu}
                    hideFn={() => setShowMenu(false)}
                    position={{ bottom: '-10px' }}
                    hideOnItemClick
                />
            </div>
            <Page
                title={"Category List"}
                show={showCategory}
                hideFn={() => setShowCategory(false)}
            >
                <CategoryList/>
            </Page>
            <Page
                title={"About Xpensed"}
                show={showAbout}
                hideFn={() => setShowAbout(false)}
            >
                <AboutApp/>
            </Page>
        </div>
    )
}