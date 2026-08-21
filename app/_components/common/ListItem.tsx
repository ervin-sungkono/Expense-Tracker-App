'use client'
import { memo } from "react"

function ListItem({ title, description, control, onClick, disabled }) {
    return(
        <div onClick={onClick} className={`${disabled ? 'pointer-events-none' : ''} cursor-pointer not-last:border-b not-last:border-b-dark/20 dark:not-last:border-b-white/20 w-full flex px-4 py-2 active:bg-neutral-300/30 dark:active:bg-light/10 transition-colors duration-150 ease-in-out`}>
            <div className={`grow flex flex-col gap-0.5 ${disabled ? 'opacity-40' : ''}`}>
                <p className="font-semibold text-sm md:text-base text-dark dark:text-white">{title}</p>
                {description && <p className="text-xs md:text-sm text-dark/80 dark:text-white/80">{description}</p>}
            </div>
            {control &&
            <div className={`flex items-center justify-center ${disabled ? 'opacity-40' : ''}`}>
                {control}
            </div>}
        </div>
    )
}

export default memo(ListItem);