'use client'
import { useState } from "react"

export default function TextField({ name, required = false, label, placeholder, rows = 1, maxLength, defaultValue = '', errorMessage = '', ref = null, onChange }) {
    const [value, setValue] = useState(defaultValue)
    
    return(
        <div className="flex flex-col gap-2">
            <label htmlFor={`id-${name}`} className="block font-semibold text-xs md:text-sm text-dark-blue">
                {label}
                {required && <span className="text-red-600">*</span>}
            </label>
            <div className="relative flex flex-col gap-1">
                <textarea
                    ref={ref}
                    id={`id-${name}`}
                    name={name}
                    value={value}
                    onInput={(e) => setValue(e.target.value)}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={rows}
                    maxLength={maxLength}
                    className={`w-full outline-none focus:border-sky-blue px-3 md:px-4 py-2 md:py-2.5 rounded-md bg-transparent border ${ errorMessage ? "border-red-600 dark:border-red-400" : "border-deep-blue dark:border-ocean-blue/60"} text-dark dark:text-white text-sm transition-colors duration-200 ease-in-out`}
                >
                </textarea>
                <div className="flex items-center gap-1">
                    {errorMessage && <p className="text-[10.8px] md:text-xs text-red-600 dark:text-red-400 grow">{errorMessage}</p>}
                    {maxLength && <p className="text-xs text-dark/80 dark:text-white/80 ml-auto">{value.length} / {maxLength}</p>}
                </div>
            </div>
        </div>
    )
}