"use client"

export default function AddExpenseButton({ item }) {
    if (!item) return
    return (
        <div 
            key={item.label}  
            className={`nav-fab`}
        >
            <button onClick={() => console.log("test")}>
                {item.icon}
                <span className="glow-effect"></span>
            </button>
        </div>
    )
}