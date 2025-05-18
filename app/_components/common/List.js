import ListItem from "./ListItem";

export default function List({ items = [] }) {
    if(items.length === 0) return;
    return(
        <div className="py-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg overflow-hidden">
            {items.map(item => (
                <ListItem key={item.id} {...item}/>
            ))}
        </div>
    )
}