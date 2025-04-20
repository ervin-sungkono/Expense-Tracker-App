import Link from "next/link";

export default function NavbarItem({ item, active = false }) {
    if (!item) return
    return(
        <div  
            className={`nav-link`}
            aria-label={item.label}
        >
            <Link href={item.url} className={`text-dark${active ? ' nav-active' : ''}`}>
                {item.icon}
            </Link>
        </div>
    )
}