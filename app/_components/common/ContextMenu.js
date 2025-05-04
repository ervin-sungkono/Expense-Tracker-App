'use client'
import { useState, useEffect } from "react";

export default function ContextMenu({ items = [], show = false, hideFn = null }) {
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
        <>
            <div className={`absolute z-50 min-w-[120px] translate-y-full origin-top-right ${show ? 'animate-[scale-in_.5s_forwards_ease-in-out]' : 'animate-[scale-out_.5s_forwards_ease-in-out]'}`} style={{ bottom: 0, right: 16 }}>
                <div className="w-full relative z-50 py-1.5 bg-neutral-100 dark:bg-neutral-600 rounded-md">
                    {items.map((item, index) => (
                        <div 
                            key={`${item.label}-${index}`} 
                            onClick={() => {
                                item.onClick && item.onClick();
                                hideFn();
                            }}
                            className="cursor-pointer px-4 py-2 hover:bg-neutral-300/30 active:bg-neutral-300/30 dark:hover:bg-neutral-800/30 dark:active:bg-neutral-800/30"
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
            <div onClick={hideFn} className="fixed w-full h-full top-0 left-0 z-10"></div>
        </>
    )
}