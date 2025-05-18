'use client'
import { useEffect, useState } from "react"

export default function Tab({ header, selected = null, contents = [] }) {
    const [selectedTab, setSelectedTab] = useState(selected);

    useEffect(() => {
        if(!selectedTab && contents.length > 0) setSelectedTab(contents[0].id)
    }, [selectedTab, contents])

    if(contents.length > 0) return(
        <div className="w-full flex flex-col">
            <div className="w-full flex justify-start gap-0.5">
                {contents.map(content => (
                    <div 
                        key={`tab-${content.id}`} 
                        onClick={() => setSelectedTab(content.id)}
                        className={`cursor-pointer select-none py-1.5 px-2.5 rounded-t-lg font-semibold text-dark dark:text-white border ${selectedTab === content.id ? 'bg-basic-gradient border-transparent' : 'border-ocean-blue'}`}
                    >
                        {content.label}
                    </div>
                ))}
            </div>
            <div className="w-full border border-ocean-blue rounded-lg rounded-tl-none">
                {contents.map((content) => (
                    <div key={`content-${content.id}`} className={`${selectedTab === content.id ? 'block' : 'hidden'}`}>
                        {content.header && content.header()}
                        {content.component}
                    </div>
                ))}
            </div>
        </div>
        
    )
}