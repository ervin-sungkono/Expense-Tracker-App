'use client'
import { useLocalStorage } from "@/app/_lib/hooks"
import { useEffect, useState } from "react";

export default function Header() {
    const [loading, setLoading] = useState(true);
    const [username, _] = useLocalStorage('username');

    useEffect(() => {
        setLoading(false);
    }, [])

    if(loading) {
        return(
            <div className="w-full flex flex-col gap-1 mb-5 animate-pulse">
                <div className="w-2/5 h-4 md:h-5 my-1 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
                <div className="w-3/4 h-7 md:h-8 my-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full"></div>
            </div>
        )
    }
    else { 
        return(
            <div className="w-full flex flex-col gap-1 mb-5">
                <p className="text-dark dark:text-white text-base md:text-lg">Welcome back,</p>
                <p className="text-dark dark:text-white w-full line-clamp-1 text-2xl md:text-3xl font-bold break-all">{username}</p>
            </div>
        )
    }
}