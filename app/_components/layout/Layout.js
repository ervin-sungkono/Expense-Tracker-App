import Navbar from "../common/navbar/Navbar";
import { NAV_ITEMS } from "@/app/_lib/const";

export default function Layout({ children, hideNavbar = false, pathname }) {
    return(
        <div className="flex flex-col overflow-auto fixed top-0 left-0 bottom-0 right-0 bg-white dark:bg-dark">
            { !hideNavbar && <Navbar items={NAV_ITEMS} pathname={pathname}/> }
            <main className="relative w-full h-full overflow-x-hidden overflow-y-auto max-w-2xl px-6 pt-6 pb-8 mx-auto">
                {children}
            </main>
        </div>
    )
}