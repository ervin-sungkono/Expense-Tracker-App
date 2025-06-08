import Link from "next/link";

export default function NavbarItem({ item, active = false }) {
    if (!item) return
    return(
        <div className={`nav-link`}>
            <Link scroll={false} href={item.url} className={`${active ? ' nav-active' : ''}`} aria-label={item.label}>
                <div aria-hidden="true">{item.icon}</div>
                <p aria-hidden="true" className='nav-label'>{item.label}</p>
            </Link>
        </div>
    )
}