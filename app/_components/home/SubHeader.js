import Link from "next/link";
import { IoChevronForward as RightIcon } from "react-icons/io5";

export default function SubHeader({ title, description, linkLabel = 'Manage', link, onClick, loading = false }) {
    if(loading) {
        return (
            <div className="w-full flex flex-col gap-0.5 mb-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                    <p className="text-lg font-semibold text-transparent bg-neutral-200 dark:bg-neutral-800 rounded-full">{title}</p>
                    {(link || onClick) && 
                    <div className="ml-auto flex items-center gap-1 text-transparent bg-neutral-200 dark:bg-neutral-800 rounded-full">
                        <p className="text-sm">{linkLabel}</p>
                        <RightIcon size={20}/>
                    </div>}
                </div>
                { description && <p className="block text-xs md:text-sm text-transparent bg-neutral-200 dark:bg-neutral-800 rounded-full">{description}</p>}
            </div>
        )
    } else {
        return(
            <div className="w-full flex flex-col gap-0.5 mb-3">
                <div className="flex items-center gap-2.5">
                    <p className="grow text-lg font-semibold text-dark dark:text-white">{title}</p>
                    {link && 
                    <Link scroll={false} href={link} className="flex items-center gap-1 text-deep-blue dark:text-ocean-blue">
                        <p className="text-sm">{linkLabel}</p>
                        <RightIcon size={20}/>
                    </Link>}
                    {onClick &&
                    <div onClick={onClick} className="cursor-pointer flex items-center gap-1 text-deep-blue dark:text-ocean-blue">
                        <p className="text-sm">{linkLabel}</p>
                        <RightIcon size={20}/>
                    </div>}
                </div>
                { description && <p className="block text-xs md:text-sm text-dark/80 dark:text-white/80">{description}</p>}
            </div>
        )
    }
    
}