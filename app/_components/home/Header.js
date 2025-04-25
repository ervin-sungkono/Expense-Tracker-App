'use client'
import { useLocalStorage } from "@/app/_lib/hooks"

export default function Header() {
    const [username, _] = useLocalStorage('username');
    return(
        <div className="w-full flex flex-col gap-2">
            <p className="text-dark dark:text-white text-base md:text-lg">Welcome back,</p>
            <p className="text-dark dark:text-white w-full line-clamp-1 text-2xl md:text-3xl font-bold">{username}</p>
        </div>
    )
}