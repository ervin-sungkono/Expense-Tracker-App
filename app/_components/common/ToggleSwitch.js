'use client'
import { useEffect, useState } from "react"

export default function ToggleSwitch({ ref, icon, switchStatus = false, onStatusChange }) {
    const [status, setStatus] = useState(switchStatus);

    const toggle = (e) => {
        e.stopPropagation();
        setStatus(!status);
    };

    useEffect(() => {
        onStatusChange && onStatusChange(status);
    }, [status])

    useEffect(() => {
        setStatus(switchStatus);
    }, [switchStatus])

    return(
        <div ref={ref} onClick={toggle} className={`cursor-pointer relative wrapper w-12 h-7 md:w-14 md:h-8 p-1 ${status ? 'bg-ocean-blue' : 'bg-neutral-300 dark:bg-neutral-600'} rounded-full transition-colors duration-200 ease-in-out`}>
            <div className={`absolute ${status ? 'translate-x-full' : 'translate-x-0'} flex justify-center items-center circle w-5 h-5 md:w-6 md:h-6 ${status ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-100 dark:bg-neutral-800'} rounded-full transition-transform duration-200 ease-in-out`}>
                {icon}
            </div>
        </div>
    )
}