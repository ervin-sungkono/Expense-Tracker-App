'use client'
import { useEffect, useState } from "react";
import ToggleSwitch from "./ToggleSwitch";
import { IoSunny as LightIcon, IoMoon as DarkIcon } from "react-icons/io5";
import { useTheme } from "next-themes";

export default function ThemeSwitch() {
    const [mounted, setMounted] = useState(false);
    const {resolvedTheme, setTheme} = useTheme();

    useEffect(() => {
        setMounted(true);
    }, [])

    if(mounted)
    return(
        <ToggleSwitch 
            icon={resolvedTheme === 'dark' ? <DarkIcon className="text-sm md:text-base"/> : <LightIcon className="text-sm md:text-base"/>} 
            switchStatus={resolvedTheme === 'dark'}
            onStatusChange={(status) => setTheme(status ? 'dark' : 'light')}
        />
    )
}