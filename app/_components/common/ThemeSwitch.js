'use client'
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import ToggleSwitch from "./ToggleSwitch";
import { IoSunny as LightIcon, IoMoon as DarkIcon } from "react-icons/io5";
import { useTheme } from "next-themes";

export default function ThemeSwitch({ ref }) {
    const [mounted, setMounted] = useState(false);
    const {resolvedTheme, setTheme} = useTheme();
    const switchRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, [])

    useImperativeHandle(ref, () => {
        return {
            toggle() {
                switchRef.current?.click();
            }
        }
    }, [])

    const toggleTheme = (status) => setTheme(status ? 'dark' : 'light')

    if(mounted)
    return(
        <ToggleSwitch 
            ref={switchRef}
            icon={resolvedTheme === 'dark' ? <DarkIcon className="text-sm md:text-base"/> : <LightIcon className="text-sm md:text-base"/>} 
            switchStatus={resolvedTheme === 'dark'}
            onStatusChange={toggleTheme}
        />
    )
}