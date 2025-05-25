import AddTransactionButton from "./AddTransactionButton";
import NavbarItem from "./NavbarItem";

export default function Navbar({ items, pathname = "/" }) {
    return(
        <nav className="navbar">
            <div className="navbar-content">
                {items.map((item, index) => (
                    index === 2 ? 
                    <AddTransactionButton key={item.label} item={item}/> : 
                    <NavbarItem key={item.label} item={item} active={pathname === item.url}/>
                ))}
            </div>
        </nav>
    )
}