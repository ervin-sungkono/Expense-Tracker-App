import ListItem from "./ListItem";

export default function List({ items = [] }) {
    if(items.length === 0) return;
    return(
        <div className="py-2 bg-light dark:bg-neutral-800 rounded-lg">
            {items.map(item => (
                <ListItem key={item.id} {...item}/>
            ))}
        </div>
    )
}