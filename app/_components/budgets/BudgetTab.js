'use client'
import { useEffect, useState } from "react"

export default function BudgetTab({ selected = null, onChange, excluded = [] }) {
    const [selectedTab, setSelectedTab] = useState(selected);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleSelectTab = (id) => {
        setSelectedTab(id);
    }

    const tabs = [
        {id: 'all', label: 'All'},
        {id: 'active', label: 'Active'},
        {id: 'finished', label: 'Finished'},
    ].filter(tab => !excluded.includes(tab.id))

    useEffect(() => {
        if(!selectedTab) {
            setSelectedTab(tabs[0].id);
            return;
        }

        setSelectedIndex(tabs.findIndex(tab => tab.id === selectedTab));
        onChange && onChange(selectedTab);
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