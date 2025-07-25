'use client'
import { useEffect, useState } from "react"
import { IoMdClose as CloseIcon } from "react-icons/io";

export default function Dialog({ children, show = false, hideFn = null, hideCancelButton = false }) {
    const [hidden, setHidden] = useState(true);

    useEffect(() => {
        let hide = null;
        if(!show && !hidden) hide = setTimeout(() => setHidden(true), 350);
        else if(show && hidden) {
            setHidden(false)
        }

        return () => clearTimeout(hide)
    }, [show, hidden])

    if(!hidden)
    return(
        <div className="fixed w-full h-full px-4 py-8 top-0 left-0 flex justify-center items-center z-[10000] overflow-hidden">
            <div className={`relative w-full overflow-y-auto max-h-full max-w-3xl bg-light dark:bg-neutral-800 rounded-lg px-6 pt-9 pb-8 z-50 ${show ? 'animate-[show_.35s_forwards_ease-in-out]' : 'animate-[hide_.35s_forwards_ease-in-out]'}`}>
                {children}
                {!hideCancelButton && 
                <button className="absolute cursor-pointer text-white p-2 bg-basic-gradient rounded-bl-lg right-0 top-0" onClick={hideFn}>
                    <CloseIcon size={20}/>
                </button>}
            </div>
            <div className={`pointer-events-none overlay absolute top-0 left-0 backdrop-blur-xl bg-neutral-700/60 w-full h-full ${show ? 'animate-[fade-in_.35s_forwards_ease-in-out]' : 'animate-[fade-out_.35s_forwards_ease-in-out]'}`}></div>
        </div>
    )
}