'use client'
import { useEffect, useState } from "react"

export default function CategoryTab({ selected = null, onChange }) {
    const [selectedTab, setSelectedTab] = useState(selected);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        setSelectedIndex(tabs.findIndex(tab => tab.id === selectedTab));
        onChange && onChange(selectedTab);
    }, [selectedTab])

    const handleSelectTab = (id) => {
        setSelectedTab(id);
    }

    const tabs = [
        {id: 'Expense', label: 'Expense'},
        {id: 'Income', label: 'Income'},
        {id: 'DebtLoan', label: 'Debt/Loan'},
    ]

    useEffect(() => {
        if(!selectedTab) setSelectedTab(tabs[0].id)
    }, [selectedTab])

    return(
        <div className="w-full flex flex-col">
            <div className="relative w-full grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                {tabs.map(tab => (
                    <div 
                        key={`tab-${tab.id}`} 
                        onClick={() => handleSelectTab(tab.id)}
                        className={`text-sm md:text-base text-center cursor-pointer pt-1.5 pb-2.5 px-4 font-semibold ${tab.id === selectedTab ? 'text-ocean-blue' : 'text-dark dark:text-white'}`}
                    >
                        {tab.label}
                    </div>
                ))}
                <span className="absolute rounded-full bg-ocean-blue h-1 left-0 bottom-0 transition-transform duration-150 ease-in-out" style={{ width: `${100/tabs.length}%`, transform: `translateX(${selectedIndex * 100}%)`}}></span>
            </div>
        </div>
    )
}