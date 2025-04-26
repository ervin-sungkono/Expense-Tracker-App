import Link from "next/link";
import { IoChevronForward as RightIcon } from "react-icons/io5";

export default function SubHeader({ title, link }) {
    return(
        <div className="w-full flex items-center gap-2.5 mb-3">
            <p className="text-lg font-semibold text-dark dark:text-white grow">{title}</p>
            {link && 
            <Link href={link} className="flex items-center gap-1 text-deep-blue dark:text-ocean-blue">
                <p className="text-sm">Manage</p>
                <RightIcon size={20}/>
            </Link>}
        </div>
    )
}