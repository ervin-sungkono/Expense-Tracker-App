'use client'
import { useState, useEffect } from "react";

export default function ContextMenu({ items = [], show = false, hideFn = null, hideOnItemClick = false, position = {} }) {
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
        <>
            <div className={`absolute z-50 min-w-[120px] translate-y-full origin-top-right ${show ? 'animate-[scale-in_.25s_forwards_ease-in-out]' : 'animate-[scale-out_.25s_forwards_ease-in-out]'}`} style={{ bottom: position.bottom ?? 0, right: position.right ?? 0 }}>
                <div className="w-full relative z-50 py-1.5 bg-light dark:bg-neutral-800 shadow-lg rounded-md">
                    {items.map((item, index) => (
                        <div 
                            key={`${item.label}-${index}`} 
                            onClick={() => { 
                                item.onClick && item.onClick();
                                hideOnItemClick && hideFn();
                            }}
                            className="cursor-pointer px-4 text-sm md:text-base text-dark dark:text-white py-2 active:bg-neutral-300/30 dark:active:bg-light/10"
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