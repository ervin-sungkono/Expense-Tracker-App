import Link from "next/link";
import { IoChevronForward as RightIcon } from "react-icons/io5";

export default function SubHeader({ title, description, link }) {
    return(
        <div className="w-full flex items-center gap-2.5 mb-3">
            <div className="flex flex-col gap-0.5 grow">
                <p className="text-lg font-semibold text-dark dark:text-white">{title}</p>
                { description && <p className="text-xs md:text-sm text-dark/80 dark:text-white/80">{description}</p>}
            </div>
            {link && 
            <Link href={link} className="flex items-center gap-1 text-deep-blue dark:text-ocean-blue">
                <p className="text-sm">Manage</p>
                <RightIcon size={20}/>
            </Link>}
        </div>
    )
}