import Link from "next/link";

export default function NavbarItem({ item, active }) {
    if (!item) return
    return(
        <div 
            key={item.label}  
            className={`nav-link`}
        >
            <Link href={item.url} className={`text-dark${active ? ' nav-active' : ''}`}>
                {item.icon}
                <span className="nav-indicator"></span>
            </Link>
        </div>
    )
}