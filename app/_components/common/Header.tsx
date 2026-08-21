export default function Header({ title, textAlign = 'start' }) {
    if(!title) return;
    return(
        <div className="w-full mb-4" style={{ textAlign }}>
            <p className="text-dark dark:text-white w-full line-clamp-1 text-2xl md:text-3xl font-bold">{title}</p>
        </div>
    )
}