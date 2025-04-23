'use client'

import { useState } from "react"

export default function InputField({ name, required = false, label, type, placeholder, defaultValue, errorMessage = '', ref = null }) {
    const [value, setValue] = useState(defaultValue)
    
    return(
        <div className="flex flex-col gap-2">
            <label htmlFor={name} className="block font-semibold text-xs md:text-sm text-dark-blue">
                {label}
                {required && <span className="text-red-600">*</span>}
            </label>
            <div className="flex flex-col gap-1">
                <input 
                    ref={ref}
                    id={name}
                    type={type}
                    value={value}
                    onInput={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full outline-none focus:border-sky-blue px-3 md:px-4 py-2 md:py-2.5 rounded-md bg-transparent border ${ errorMessage ? "border-red-600 dark:border-red-400" : "border-deep-blue dark:border-ocean-blue/60"} text-dark dark:text-white text-sm transition-colors duration-200 ease-in-out`}
                />
                {errorMessage && <p className="text-xs md:text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
            </div>
        </div>
    )
}