'use client'
import { useEffect, useState } from "react"
import { IoMdClose } from "react-icons/io";

export default function Dialog({ children, show = false, hideFn = null }) {
    const [hidden, setHidden] = useState(true);

    useEffect(() => {
        if(!show) setTimeout(() => setHidden(true), 500);
        else setHidden(false);
    }, [show])

    if(!hidden)
    return(
        <div className="fixed w-full h-full px-6 py-8 top-0 left-0 flex justify-center items-center">
            <div className={`relative w-full max-h-full max-w-2xl bg-white dark:bg-neutral-700 rounded-lg px-6 py-8 z-50 ${show ? 'animate-[show_.5s_forwards_ease-in-out]' : 'animate-[hide_.5s_forwards_ease-in-out]'}`}>
                {children}
                <button className="absolute cursor-pointer p-2 bg-basic-gradient rounded-full right-0 top-0 -translate-y-1/3 translate-x-1/3 hover:scale-105 active:scale-95 transition-transform duration-150 ease-in-out" onClick={hideFn}>
                    <IoMdClose size={20}/>
                </button>
            </div>
            <div className="overlay absolute bg-dark/60 w-full h-full"></div>
        </div>
    )
}