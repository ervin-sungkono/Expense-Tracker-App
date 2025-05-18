'use client'
import { useEffect, useState } from "react";
import { IoChevronBack as BackIcon } from "react-icons/io5";

export default function Page({ children, title, show = false, hideFn = null, hideBackButton = false }) {
    const [hidden, setHidden] = useState(true);

    useEffect(() => {
        let hide = null;
        if(!show && !hidden) hide = setTimeout(() => setHidden(true), 500);
        else if(show && hidden) {
            setHidden(false)
        }

        return () => clearTimeout(hide)
    }, [show, hidden])

    if(!hidden)
    return(
        <div className="fixed w-full h-full top-0 left-0 right-0 bottom-0 flex justify-center items-center z-[10000]">
            <div className={`relative w-full h-full flex flex-col overflow-y-auto max-w-2xl bg-white dark:bg-neutral-700 px-6 pb-8 z-50 ${show ? 'animate-[slide-in_.5s_forwards_ease-in-out]' : 'animate-[slide-out_.5s_forwards_ease-in-out]'}`}>
                <div className="relative h-14 md:h-16 flex gap-4 justify-center items-center">
                    {!hideBackButton && 
                    <div onClick={hideFn} className="absolute left-0 cursor-pointer select-none p-2.5 rounded-full active:bg-neutral-300/30 dark:active:bg-neutral-800/30">
                        <BackIcon size={20}/>
                    </div>}
                    <p className="font-semibold text-lg md:text-xl">{title}</p>
                </div>
                {children}
            </div>
        </div>
    )
}