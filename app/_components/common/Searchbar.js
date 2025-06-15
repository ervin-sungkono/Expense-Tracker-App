'use client'
import { useState } from "react";
import { IoSearch as SearchIcon } from "react-icons/io5";

export default function SearchBar({ ref, placeholder, maxLength, onSearch }) {
    const [value, setValue] = useState("");

    const handleSearch = () => {
        onSearch && onSearch(value);
    }

    return(
        <div className="relative w-full flex flex-col gap-1">
            <input 
                ref={ref}
                type={"text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if(e.key === 'Enter') handleSearch();
                }}
                placeholder={placeholder}
                maxLength={maxLength}
                className={`w-full outline-none focus:border-sky-blue px-3 md:px-4 py-2 md:py-2.5 rounded-md bg-transparent border border-deep-blue dark:border-ocean-blue/60 text-dark dark:text-white text-sm transition-colors duration-200 ease-in-out`}
            />
            <div onClick={handleSearch} className="cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full active:bg-neutral-200/30 dark:active:bg-light/10 transition-colors duration-150 ease-in-out">
                <SearchIcon size={18}/>
            </div>
        </div>
    )
}