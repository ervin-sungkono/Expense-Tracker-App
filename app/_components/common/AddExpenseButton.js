'use client'

export default function AddExpenseButton({ item }) {
    if (!item) return
    return (
        <div 
            className={`nav-fab`}
            aria-label={item.label}
        >
            <div className="fab-wrapper">
                <button onClick={() => console.log("test")}>
                    {item.icon}
                </button>
            </div>
        </div>
    )
}