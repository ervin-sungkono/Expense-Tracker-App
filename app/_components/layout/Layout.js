import Navbar from "../common/navbar/Navbar";
import ActionBar from "../common/ActionBar";
import BudgetRepeatUpdate from "../budgets/BudgetRepeatUpdate";
import { NAV_ITEMS } from "@/app/_lib/const";

export default function Layout({ children, hideNavbar = false, hideActionBar = false, pathname }) {
    return(
        <div className="flex flex-col overflow-auto fixed top-0 left-0 bottom-0 right-0">
            <BudgetRepeatUpdate/>
            { !hideActionBar && <ActionBar/> }
            { !hideNavbar && <Navbar items={NAV_ITEMS} pathname={pathname}/> }
            <main className={`relative w-full h-full overflow-x-hidden overflow-y-auto max-w-2xl px-6 ${hideActionBar ? 'pt-6' : 'pt-4'} ${hideNavbar ? 'pb-8' : 'mb-22'} mx-auto`}>
                {children}
            </main>
        </div>
    )
}